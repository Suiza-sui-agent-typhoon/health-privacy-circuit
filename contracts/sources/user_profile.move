module suiza::Streak_profile{
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::event;

    // ============== Events ==============
    public struct WorkoutRecorded has copy, drop {
        user: address,
        streak: u64,
        timestamp: u64
    }

    public struct RewardClaimed has copy, drop {
        user: address,
        amount: u64,
        streak_milestone: u64,
        timestamp: u64
    }

    public struct WeeklyChallengeCompleted has copy, drop {
        user: address,
        streak: u64,
        timestamp: u64
    }

    // ============== Constants & Structs ==============
    const DAY_IN_MS: u64 = 86400000; // 24 hours in milliseconds
    const ERROR_INVALID_TIMESTAMP: u64 = 1;
    const ERROR_ALREADY_CLAIMED: u64 = 2;
    const ERROR_STREAK_NOT_ELIGIBLE: u64 = 3;
    const ERROR_TOO_EARLY: u64 = 4;

    /// Admin capability for authorization
    public struct AdminCap has key { id: UID }

    /// Shared configuration for reward parameters
    public struct RewardConfig has key {
        id: UID,
        daily_reward: u64,
        weekly_reward: u64,
        streak_requirement: u64,
        reward_interval: u64, // In days
        treasury: Balance<SUI>
    }

    /// User-specific workout data
    public struct UserProfile has key, store {
        id: UID,
        streak: u64,
        last_workout_time: u64,
        weekly_challenges: u64,
        last_claim_streak: u64, // Track last claimed streak milestone
        next_eligible_time: u64 // Earliest time for next workout
    }

    // ============== Initialization ==============
    /// Initialize contract with default parameters
     fun init(ctx: &mut TxContext) {
        let reward_config = RewardConfig {
            id: object::new(ctx),
            daily_reward: 1000000,
            weekly_reward: 100000000,
            streak_requirement: 7,
            reward_interval: 1,
            treasury: balance::zero<SUI>()
        };
        let admin_cap = AdminCap { id: object::new(ctx) };
        
        transfer::share_object(reward_config);
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // ============== Core Functionality ==============
    /// Create initial profile for new users
    public entry fun create_profile(clock: &Clock, ctx: &mut TxContext) {
        let current_time = clock::timestamp_ms(clock);
        let profile = UserProfile {
            id: object::new(ctx),
            streak: 0,
            last_workout_time: current_time,
            weekly_challenges: 0,
            last_claim_streak: 0,
            next_eligible_time: current_time
        };
        transfer::transfer(profile, tx_context::sender(ctx));
    }

    /// Record daily workout using Clock for timestamp verification
    public entry fun record_workout(
        user: &mut UserProfile,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Verify timing constraints
        assert!(current_time >= user.next_eligible_time, ERROR_TOO_EARLY);
        
        // Check if streak should be reset (more than 48 hours since last workout)
        if (current_time > user.last_workout_time + (2 * DAY_IN_MS)) {
            user.streak = 0;
        };

        // Update workout data
        user.streak =user.streak + 1;
        user.last_workout_time = current_time;
        user.next_eligible_time = current_time + DAY_IN_MS; // Next workout allowed after 24 hours

        // Emit workout recorded event
        event::emit(WorkoutRecorded {
            user: tx_context::sender(ctx),
            streak: user.streak,
            timestamp: current_time
        });
    }

    /// Claim rewards for streak milestones
    public entry fun claim_streak_reward(
        user: &mut UserProfile,
        config: &mut RewardConfig,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let streak = user.streak;
        
        // Verify streak is eligible for reward (multiple of streak_requirement)
        assert!(streak % config.streak_requirement == 0, ERROR_STREAK_NOT_ELIGIBLE);
        
        // Verify streak hasn't been claimed already
        assert!(streak > user.last_claim_streak, ERROR_ALREADY_CLAIMED);
        
        // Calculate reward tier (how many streak_requirements achieved)
        let tier = streak / config.streak_requirement;
        let reward_amount = config.weekly_reward * tier;
        
        // Update claim tracking
        user.last_claim_streak = streak;
        
        // Distribute reward
        let reward = coin::take(&mut config.treasury, reward_amount, ctx);
        transfer::public_transfer(reward, tx_context::sender(ctx));

        // Emit reward claimed event
        event::emit(RewardClaimed {
            user: tx_context::sender(ctx),
            amount: reward_amount,
            streak_milestone: streak,
            timestamp: clock::timestamp_ms(clock)
        });

        // If completed weekly challenge
        if (streak % config.streak_requirement == 0) {
            user.weekly_challenges = user.weekly_challenges + 1;
            event::emit(WeeklyChallengeCompleted {
                user: tx_context::sender(ctx),
                streak,
                timestamp: clock::timestamp_ms(clock)
            });
        }
    }

    // ============== User Actions ==============
    /// Use weekly challenge to join fitness challenge
    public entry fun join_challenge(
        user: &mut UserProfile,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(user.weekly_challenges > 0, 0);
        user.weekly_challenges = user.weekly_challenges - 1;
        
        event::emit(WorkoutRecorded {
            user: tx_context::sender(ctx),
            streak: user.streak,
            timestamp: clock::timestamp_ms(clock)
        });
    }

    // ============== Admin Functions ==============
    /// Update daily reward amount
    public entry fun set_daily_reward(
        config: &mut RewardConfig,
        amount: u64,
        _: &AdminCap
    ) {
        config.daily_reward = amount;
    }

    /// Fund the reward treasury
    public entry fun fund_treasury(
        config: &mut RewardConfig,
        coins: Coin<SUI>
    ) {
        let balance = coin::into_balance(coins);
        balance::join(&mut config.treasury, balance);
    }

    /// Reset user profile (admin only)
     entry fun reset_user(
        user: &mut UserProfile,
        clock: &Clock,
        _: &AdminCap
    ) {
        user.streak = 0;
        user.last_workout_time = clock::timestamp_ms(clock);
        user.weekly_challenges = 0;
        user.last_claim_streak = 0;
        user.next_eligible_time = clock::timestamp_ms(clock);
    }

   

    // ============== View Functions ==============
    /// Get user's current streak
    public fun get_streak(user: &UserProfile): u64 {
        user.streak
    }

    /// Get user's last workout timestamp
    public fun get_last_workout_time(user: &UserProfile): u64 {
        user.last_workout_time
    }

    /// Check if user can claim reward
    public fun can_claim_reward(user: &UserProfile): bool {
        user.streak > user.last_claim_streak && user.streak % 7 == 0
    }
}