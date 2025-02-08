// example.ts
import { HealthPrivacySystem } from './health-privacy';
import { JsonRpcProvider, RawSigner, Ed25519Keypair } from '@mysten/sui';

async function main() {
    // Initialize provider and signer
    const provider = new JsonRpcProvider();
    const keypair = new Ed25519Keypair();
    const signer = new RawSigner(keypair, provider);

    // Initialize system with your package ID
    const system = new HealthPrivacySystem(
        provider,
        signer,
        '0x6092b9877722bbca9c8b6ff4980b182e7e45af81122ecb78fa62f65dc65ddc55'
    );
    await system.initialize();

    // Sample health data
    const healthData = {
        blood_pressure: 120,
        heart_rate: 75,
        temperature: 37,
        oxygen: 98,
        respiratory_rate: 16
    };

    // Create profile
    const createTx = await system.createProfile(healthData);
    console.log('Profile created:', createTx.digest);

    // Grant access to heart rate
    const grantTx = await system.grantAccess(
        'PROFILE_ID',
        'VIEWER_ADDRESS',
        1,  // heart rate index
        healthData
    );
    console.log('Access granted:', grantTx.digest);
}

main().catch(console.error);