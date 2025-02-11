import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { groth16 } from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import path from 'path';
import { getFaucetHost, requestSuiFromFaucetV0 } from '@mysten/sui/faucet';
import fs from 'fs/promises';
import { bcs } from '@mysten/sui/bcs';


interface HealthData {
    blood_pressure: number;
    heart_rate: number;
    temperature: number;
    oxygen: number;
    respiratory_rate: number;
    height: number;
    weight: number;
    age: number;
}

class HealthPrivacySystem {
    private client: SuiClient;
    private signer: Ed25519Keypair;
    private packageId: string;
    private poseidon: any;
    private wasmFile: string;
    private zkeyFile: string;

    constructor(client: SuiClient, signer: Ed25519Keypair, packageId: string) {
        this.client = client;
        this.signer = signer;
        this.packageId = packageId;
        this.wasmFile = path.resolve(__dirname, 'healthcare_js', 'healthcare.wasm');
        this.zkeyFile = path.resolve(__dirname,'healthcare_disclosure_final.zkey');
    }

    async initialize() {
        try {
            this.poseidon = await buildPoseidon();
            // Verify circuit files exist using Node.js fs
            await Promise.all([
                fs.access(this.wasmFile),
                fs.access(this.zkeyFile)
            ]);
        } catch (error) {
            throw new Error(`Initialization failed: ${error}. Please ensure circuit files exist at ${this.wasmFile} and ${this.zkeyFile}`);
        }
    }

    private validateHealthData(data: HealthData) {
        const ranges = {
            blood_pressure: { min: 60, max: 200 },
            heart_rate: { min: 40, max: 200 },
            temperature: { min: 35, max: 42 },
            oxygen: { min: 70, max: 100 },
            respiratory_rate: { min: 8, max: 30 }
        };

        // for (const [key, range] of Object.entries(ranges)) {
        //     const value = data[key];
        //     if (value < range.min || value > range.max) {
        //         throw new Error(`${key} value ${value} is outside valid range ${range.min}-${range.max}`);
        //     }
        // }
    }

    private normalizeToField(value: number): string {
        // Convert to positive integer, handling decimal places appropriately
        const normalizedValue = Math.floor(Math.abs(value * 100));
        return normalizedValue.toString();
    }

    private async generateCommitment(data: HealthData): Promise<string> {
        try {
            // Validate health data before processing
            this.validateHealthData(data);

            // Convert all values to field elements
            const values = [
                data.blood_pressure,
                data.heart_rate,
                data.temperature,
                data.oxygen,
                data.respiratory_rate,
                data.height,
                data.weight,
                data.age
            ].map(v => this.poseidon.F.e(this.normalizeToField(v)));

            // Generate Poseidon hash
            const hash = this.poseidon(values);
            const commitment = this.poseidon.F.toString(hash);

            console.log('Generated commitment:', commitment);
            return commitment;
        } catch (error) {
            throw new Error(`Commitment generation failed: ${error}`);
        }
    }

    private async generateProof(data: HealthData, parameterIndex: number) {
        if (parameterIndex < 0 || parameterIndex > 4) {
            throw new Error('Invalid parameter index');
        }

        try {
            const commitment = await this.generateCommitment(data);
            
            // Prepare normalized values
            const normalizedValues = [
                data.blood_pressure,
                data.heart_rate,
                data.temperature,
                data.oxygen,
                data.respiratory_rate,
                data.height,
                data.weight,
                data.age
            ].map(v => this.normalizeToField(v));

            // Create circuit input
            const input = {
                disclosed_parameter: normalizedValues[parameterIndex],
                disclosure_index: parameterIndex,
                commitment: commitment,
                blood_pressure: normalizedValues[0],
                heart_rate: normalizedValues[1],
                temperature: normalizedValues[2],
                oxygen: normalizedValues[3],
                respiratory_rate: normalizedValues[4],
                height: normalizedValues[5],
                weight: normalizedValues[6],
                age: normalizedValues[7]
            };

            console.log('\nGenerating proof with input:', JSON.stringify(input, null, 2));

            // Generate zero-knowledge proof
            const result = await groth16.fullProve(
                input,
                this.wasmFile,
                this.zkeyFile
            );
            console.log("proof generated",result)

            return result;
        } catch (error) {
            console.error('Proof generation failed:', error);
            throw error;
        }
    }

    async createProfile(healthData: HealthData) {
        const commitment = await this.generateCommitment(healthData);

        console.log('\nCreating health profile with commitment:', commitment);
       

        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${this.packageId}::health::create_health_profile`,
            arguments: [
                tx.pure(commitment),
                tx.pure(5), // Number of health data parameters
            ]
        });

        return await this.client.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
            options: {
                showEffects: true,
                showEvents: true
            }
        });
    }

    async grantAccess(
        profileId: string,
        viewerAddress: string,
        dataIndex: number,
        healthData: HealthData,
        expiration: number | null = null
    ) {
        console.log('\nGenerating access proof...');
        console.log('Data Index:', dataIndex);
        console.log('Health Data:', healthData);

        const { proof, publicSignals } = await this.generateProof(healthData, dataIndex);
        console.log('Proof:', proof);
        console.log('Public Signals:', publicSignals);
      //   const encodeBigIntToBytes = (bigIntStr: string): number[] => {
      //     return Array.from(Buffer.from(BigInt(bigIntStr).toString(16), 'hex'));
      // };
    //   const flattenedProof = [
    //     ...encodeBigIntToBytes(proof.pi_a[0]),
    //     ...encodeBigIntToBytes(proof.pi_a[1]),
    //     ...encodeBigIntToBytes(proof.pi_b[0][0]), // pi_b is nested
    //     ...encodeBigIntToBytes(proof.pi_b[0][1]),
    //     ...encodeBigIntToBytes(proof.pi_b[1][0]),
    //     ...encodeBigIntToBytes(proof.pi_b[1][1]),
    //     ...encodeBigIntToBytes(proof.pi_c[0]),
    //     ...encodeBigIntToBytes(proof.pi_c[1])
    // ];

    // console.log('Flattened proof:', flattenedProof);
    const proofData=JSON.stringify(proof)
        const tx = new TransactionBlock();
       // Serialize the expiration as an Option<u64>
    const  nullOption = bcs.option(bcs.string()).serialize(null).toBytes();
    const parsedNullOption = bcs.option(bcs.string()).parse(nullOption);

        tx.moveCall({
            target: `${this.packageId}::health::grant_access`,
            arguments: [
                tx.object(profileId),
                tx.pure(viewerAddress),
                tx.pure(dataIndex),
                tx.pure(proofData),
                tx.pure(nullOption),// Passing `None` for expiration (Move's `Option<u64>`)
            ]
        });

        return await this.client.signAndExecuteTransactionBlock({
            signer: this.signer,
            transactionBlock: tx,
            options: {
                showEffects: true,
                showEvents: true
            }
        });
    }
}

async function main() {
    try {
        // Initialize client and system
        const client = new SuiClient({ url: getFullnodeUrl('devnet') });
        const keypair = new Ed25519Keypair();
        const keypair2= new Ed25519Keypair();
        const system = new HealthPrivacySystem(
            client,
            keypair,
            '0x1b74ebc0ca6ded62a85743b33056c3e6e3706534dee705976e8441caa85b017b' // your package ID
        );
        
        await system.initialize();

        // Sample health data
        const healthData = {
            blood_pressure: 120,
            heart_rate: 75,
            temperature: 37,
            oxygen: 98,
            respiratory_rate: 16,
           height: 180,
            weight: 70,
            age: 25

        };

        // Request tokens from faucet
        await requestSuiFromFaucetV0({
            host: getFaucetHost('devnet'),
            recipient: keypair.getPublicKey().toSuiAddress(),
        });
        await requestSuiFromFaucetV0({
          host: getFaucetHost('devnet'),
          recipient: keypair2.getPublicKey().toSuiAddress(),
      });

        // Create profile
        console.log('\nCreating profile...');
        const createTx = await system.createProfile(healthData);
        const createdObjects = createTx.effects?.created || [];
        const userProfileId = createdObjects[0].reference.objectId;
        console.log('Profile created:', userProfileId);

        // Grant access to viewer
        console.log('\nTesting access grant...');
        const viewerAddress = keypair2.getPublicKey().toSuiAddress();
        const grantTx = await system.grantAccess(
            userProfileId,
            viewerAddress,
            1,  // heart rate index
            healthData,
             // 1 second expiration
        );
        console.log('Access granted:', grantTx.digest);



   

    } catch (error) {
        console.error('\nExecution Error:', error);
        throw error;
    }
}

main();

export { HealthPrivacySystem, HealthData };