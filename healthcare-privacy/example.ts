import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { groth16 } from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import path from 'path';
import { getFaucetHost, requestSuiFromFaucetV0 } from '@mysten/sui/faucet';

interface HealthData {
    blood_pressure: number;
    heart_rate: number;
    temperature: number;
    oxygen: number;
    respiratory_rate: number;
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
        this.wasmFile = path.join(__dirname, 'healthcare_js/healthcare.wasm');
        this.zkeyFile = path.join(__dirname, 'healthcare_disclosure_final.zkey');
    }

    async initialize() {
        this.poseidon = await buildPoseidon();
    }

    private normalizeToField(value: number): string {
        // Ensure values are positive and properly formatted for the circuit
        const normalizedValue = Math.abs(Math.floor(value));
        return normalizedValue.toString();
    }

    private async generateCommitment(data: HealthData): Promise<string> {
        const values = [
            data.blood_pressure,
            data.heart_rate,
            data.temperature,
            data.oxygen,
            data.respiratory_rate
        ].map(v => this.poseidon.F.e(this.normalizeToField(v)));

        const hash = this.poseidon(values);
        const commitment = this.poseidon.F.toString(hash);
        
        console.log('Normalized input values:', values.map(v => this.poseidon.F.toString(v)));
        console.log('Generated commitment:', commitment);
        
        return commitment;
    }

    private async generateProof(data: HealthData, parameterIndex: number) {
        const commitment = await this.generateCommitment(data);
        
        // Create array of normalized values
        const normalizedValues = [
            data.blood_pressure,
            data.heart_rate,
            data.temperature,
            data.oxygen,
            data.respiratory_rate
        ].map(v => this.normalizeToField(v));

        // Debug: Log the values and selected index
        console.log('\nDebug Information:');
        console.log('Parameter Index:', parameterIndex);
        console.log('All Values:', normalizedValues);
        console.log('Selected Value:', normalizedValues[parameterIndex]);
        
        const input = {
            disclosed_parameter: normalizedValues[parameterIndex],
            disclosure_index: parameterIndex,
            commitment: commitment,
            blood_pressure: normalizedValues[0],
            heart_rate: normalizedValues[1],
            temperature: normalizedValues[2],
            oxygen: normalizedValues[3],
            respiratory_rate: normalizedValues[4]
        };

        // Debug: Log the complete input
        console.log('\nCircuit Input:');
        console.log(JSON.stringify(input, null, 2));

        try {
            const result = await groth16.fullProve(
                input,
                this.wasmFile,
                this.zkeyFile
            );
            console.log('\nProof Generated Successfully');
            return result;
        } catch (error) {
            console.error('\nProof Generation Error:');
            console.error('Error details:', error);
            
            // Additional debug information
            console.log('\nCircuit State:');
            console.log('Disclosed Parameter:', input.disclosed_parameter);
            console.log('Expected Parameter:', normalizedValues[parameterIndex]);
            
            throw error;
        }
    }

    async createProfile(healthData: HealthData) {
        const commitment = await this.generateCommitment(healthData);
        
        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${this.packageId}::profile::create_profile`,
            arguments: [
                tx.pure(commitment),
                tx.pure(5)
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
        healthData: HealthData
    ) {
        console.log('\nGenerating access proof...');
        console.log('Data Index:', dataIndex);
        console.log('Health Data:', healthData);

        const { proof, publicSignals } = await this.generateProof(healthData, dataIndex);

        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${this.packageId}::profile::grant_access`,
            arguments: [
                tx.object(profileId),
                tx.pure(viewerAddress),
                tx.pure(dataIndex),
                tx.pure([proof.pi_a, proof.pi_b, proof.pi_c].flat())
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
        const client = new SuiClient({ url: getFullnodeUrl('devnet') });
        const keypair = new Ed25519Keypair();
        const system = new HealthPrivacySystem(
            client,
            keypair,
            '0x6092b9877722bbca9c8b6ff4980b182e7e45af81122ecb78fa62f65dc65ddc55'
        );
        await system.initialize();

        const healthData = {
            blood_pressure: 120,
            heart_rate: 75,
            temperature: 37,
            oxygen: 98,
            respiratory_rate: 16
        };

        await requestSuiFromFaucetV0({
            host: getFaucetHost('devnet'),
            recipient: keypair.getPublicKey().toSuiAddress(),
        });

        console.log('\nCreating profile...');
        const createTx = await system.createProfile(healthData);
        const createdObjects = createTx.effects?.created || [];
        const userProfileId = createdObjects[0].reference.objectId;
        console.log('Profile created:', userProfileId);

        console.log('\nTesting access grant...');
        const grantTx = await system.grantAccess(
            userProfileId,
            "0xe6bfa9b99ba5ab3cadaa268e11f0f3eecd7dd5359fb5ad0f26d83910207f3ead",
            1,  // heart rate index
            healthData
        );
        console.log('Access granted:', grantTx.digest);

    } catch (error) {
        console.error('\nExecution Error:', error);
        throw error;
    }
}

main().catch(console.error);