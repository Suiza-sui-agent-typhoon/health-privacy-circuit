pragma circom 2.2.1;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template HealthcareDisclosure() {
    // Public inputs
    signal input disclosed_parameter;
    signal input disclosure_index;
    signal input commitment;

    // Private inputs
    signal input blood_pressure;
    signal input heart_rate;
    signal input temperature;
    signal input oxygen;
    signal input respiratory_rate;
    signal input height;
    signal input weight;
    signal input age;

    // Output signals to make inputs public
    signal output out_disclosed_parameter;
    signal output out_disclosure_index;
    signal output out_commitment;

    // Connect public inputs to outputs
    out_disclosed_parameter <== disclosed_parameter;
    out_disclosure_index <== disclosure_index;
    out_commitment <== commitment;

    // Calculate commitment hash (now with 8 inputs)
    component hasher = Poseidon(8);
    hasher.inputs[0] <== blood_pressure;
    hasher.inputs[1] <== heart_rate;
    hasher.inputs[2] <== temperature;
    hasher.inputs[3] <== oxygen;
    hasher.inputs[4] <== respiratory_rate;
    hasher.inputs[5] <== height;
    hasher.inputs[6] <== weight;
    hasher.inputs[7] <== age;

    // Verify commitment
    commitment === hasher.out;

    // Create equality checks for each possible index
    component eq0 = IsEqual();
    component eq1 = IsEqual();
    component eq2 = IsEqual();
    component eq3 = IsEqual();
    component eq4 = IsEqual();
    component eq5 = IsEqual();
    component eq6 = IsEqual();
    component eq7 = IsEqual();

    // Check index against each possible value (0-7)
    eq0.in[0] <== disclosure_index;
    eq0.in[1] <== 0;

    eq1.in[0] <== disclosure_index;
    eq1.in[1] <== 1;

    eq2.in[0] <== disclosure_index;
    eq2.in[1] <== 2;

    eq3.in[0] <== disclosure_index;
    eq3.in[1] <== 3;

    eq4.in[0] <== disclosure_index;
    eq4.in[1] <== 4;

    eq5.in[0] <== disclosure_index;
    eq5.in[1] <== 5;

    eq6.in[0] <== disclosure_index;
    eq6.in[1] <== 6;

    eq7.in[0] <== disclosure_index;
    eq7.in[1] <== 7;

    // Verify exactly one selector is active
    eq0.out + eq1.out + eq2.out + eq3.out + eq4.out + eq5.out + eq6.out + eq7.out === 1;

    // Compute individual products as separate quadratic constraints
    signal term0;
    term0 <== blood_pressure * eq0.out;

    signal term1;
    term1 <== heart_rate * eq1.out;

    signal term2;
    term2 <== temperature * eq2.out;

    signal term3;
    term3 <== oxygen * eq3.out;

    signal term4;
    term4 <== respiratory_rate * eq4.out;

    signal term5;
    term5 <== height * eq5.out;

    signal term6;
    term6 <== weight * eq6.out;

    signal term7;
    term7 <== age * eq7.out;

    // Sum the computed terms (this sum is a linear combination)
    signal computedDisclosure;
    computedDisclosure <== term0 + term1 + term2 + term3 + term4 + term5 + term6 + term7;

    // Verify that the disclosed parameter matches the selected value
    disclosed_parameter === computedDisclosure;

    // Verify index bounds (0-7) using the LessThan comparator
    component lessThan = LessThan(4); // Increased bits to handle larger range
    lessThan.in[0] <== disclosure_index;
    lessThan.in[1] <== 8;  // 8 is the exclusive upper bound (so valid indices are 0-7)
    lessThan.out === 1;
}

component main {public [disclosed_parameter, disclosure_index, commitment]} = HealthcareDisclosure();