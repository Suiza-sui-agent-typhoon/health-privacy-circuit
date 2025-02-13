# Streak Profile & Health Tracking System

A comprehensive Sui blockchain smart contract system designed to track and reward user engagement through streak-based mechanics while monitoring health-related metrics. This package implements a gamified approach to maintaining consistent user participation with configurable reward mechanisms.

## Overview

The Streak Profile system combines user engagement tracking with health monitoring capabilities, deployed on the Sui blockchain. It features a flexible administrative system, customizable reward configurations, and secure health data management.

## System Architecture

### Core Components

#### 1. Streak Profile Module
- **Module Path**: `Streak_profile`
- **Package ID**: `0xfaa514bdccf3992eaf80521505618b724a43cf7ad9ccd16ee188b61c973b1eff`
- **Purpose**: Manages user engagement streaks and reward distribution
- **Key Features**:
  - Streak tracking mechanism
  - Configurable reward tiers
  - User profile management
  - Activity verification system

#### 2. Health Module
- **Module Path**: `health`
- **Purpose**: Tracks and manages health-related metrics
- **Integration**: Works in conjunction with streak profiles to validate health-related activities

### System Objects

#### Administrative Capability (AdminCap)
- **Object Type**: `Streak_profile::AdminCap`
- **Owner Address**: `0x5ba2b743c10b264749c9fb347153daa7044628397e2d09c4924038a51abfccd1`
- **Version**: 4612865
- **Capabilities**:
  - Reward configuration updates
  - System parameter adjustments
  - User profile management
  - Emergency controls

#### Reward Configuration
- **Object Type**: `Streak_profile::RewardConfig`
- **Ownership**: Shared object (accessible at version 4612865)
- **Purpose**: Stores and manages reward distribution parameters
- **Features**:
  - Configurable reward tiers
  - Streak multipliers
  - Achievement thresholds

#### Package Management
- **UpgradeCap Type**: `0x2::package::UpgradeCap`
- **Version**: 4612865
- **Purpose**: Enables secure package upgrades and maintenance

## Deployment Information

### Transaction Details
- **Status**: Successfully deployed
- **Epoch**: 66
- **Transaction Digest**: `3YwgQCA9Bg8An3bdSnsXW1rSNDjwRFdh5kvRruzMJW3u`

### Resource Consumption
- **Storage Cost**: 42,567,600 MIST
- **Computation Cost**: 1,000,000 MIST
- **Storage Rebate**: 978,120 MIST
- **Net Storage Fee**: 9,880 MIST (non-refundable)

### Dependencies
- Primary Dependency: `14K4SkHvjiSeZjXGvJGuPuCai91zYdKDpRzUbvfiCuJo`
- Secondary Dependency: `EYkfs9J1s5Kzu8V36DweMjohG7aSDaMpnMQA9D8eeGBd`

## Setup and Integration

### Prerequisites
1. Sui CLI tools installed
2. Access to Sui network (testnet or mainnet)
3. Sufficient SUI tokens for deployment and interaction

### Installation Steps
1. Clone the repository
2. Configure your Sui environment
3. Deploy the package using the provided deployment script
4. Initialize the reward configuration
5. Set up administrative controls

### Basic Usage

```move
// Example: Initializing a user profile
public entry fun create_profile(
    ctx: &mut TxContext
) {
    // Implementation details
}

// Example: Recording an activity
public entry fun record_activity(
    profile: &mut Profile,
    activity_type: u8,
    ctx: &mut TxContext
) {
    // Implementation details
}
```

## Administrative Functions

### Reward Configuration
```move
// Example: Updating reward parameters
public entry fun update_rewards(
    admin_cap: &AdminCap,
    reward_config: &mut RewardConfig,
    new_parameters: vector<u64>,
    ctx: &mut TxContext
) {
    // Implementation details
}
```

### Profile Management
```move
// Example: Administrative profile operations
public entry fun admin_update_profile(
    admin_cap: &AdminCap,
    profile: &mut Profile,
    new_status: u8,
    ctx: &mut TxContext
) {
    // Implementation details
}
```

## Security Considerations

1. Administrative access is controlled through capability objects
2. Shared objects use appropriate access controls
3. Reward distribution includes validation checks
4. Health data is stored with privacy considerations
5. System parameters are protected against unauthorized modifications

## Error Handling

The system implements comprehensive error handling for:
- Invalid operations
- Unauthorized access attempts
- Configuration errors
- Resource constraints
- Network-related issues

## Testing

To run the test suite:
```bash
sui move test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

[Add appropriate license information]

## Contact

[Add contact information]

## Acknowledgments

- Sui Move development team
- Community contributors
- [Add other acknowledgments]

---

**Note**: This package is designed for production use and includes proper security measures. However, always conduct thorough testing before mainnet deployment.