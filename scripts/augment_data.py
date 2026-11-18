import pandas as pd
import numpy as np
import os
import random

print("="*80)
print("REALISTIC FRAUD DATA AUGMENTATION")
print("="*80)

# 1. Load Data
current_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(current_dir, '..', 'data', 'raw', 'PS_20174392719_1491204439457_log.csv')
augmented_data_path = os.path.join(current_dir, '..', 'data', 'raw', 'PS_20174392719_1491204439457_log_augmented.csv')

print(f"Loading data from {data_path}...")
df = pd.read_csv(data_path)
print(f"Original dataset size: {len(df)} rows")

# 2. Define targets for augmentation
target_types = ['PAYMENT', 'CASH_IN', 'DEBIT']
samples_per_type = 250
new_fraud_rows = []

print("\nSynthesizing realistic fraud cases (40/40/20 mix)...")
np.random.seed(42)
random.seed(42)

for t in target_types:
    # Get non-fraud transactions of this type
    eligible_rows = df[(df['type'] == t) & (df['isFraud'] == 0)]
    
    # Randomly sample cases
    sampled = eligible_rows.sample(n=samples_per_type, random_state=42).copy()
    
    # Set base fraud class
    sampled['isFraud'] = 1
    
    # Split into 3 buckets: 40% (100), 40% (100), 20% (50)
    bucket1_idx = sampled.index[:100]
    bucket2_idx = sampled.index[100:200]
    bucket3_idx = sampled.index[200:250]
    
    # 🟢 Type 1: Partial draining (40% - indices 0 to 99)
    # Large suspicious withdrawal, not obvious fraud.
    subset1 = sampled.loc[bucket1_idx].copy()
    random_factors = np.random.uniform(0.6, 0.95, size=len(subset1))
    subset1['amount'] = subset1['oldbalanceOrg'] * random_factors
    subset1['newbalanceOrig'] = subset1['oldbalanceOrg'] - subset1['amount']
    
    # 🟡 Type 2: Balance inconsistency (40% - indices 100 to 199)
    # amount is deducted, but balance doesn't reflect it
    subset2 = sampled.loc[bucket2_idx].copy()
    subset2['amount'] = np.random.uniform(1000, 15000, size=len(subset2))
    subset2['newbalanceOrig'] = subset2['oldbalanceOrg']  # No deduction applied
    
    # 🔴 Type 3: Impossible balance (20% - indices 200 to 249)
    # Balance increases after spending!
    subset3 = sampled.loc[bucket3_idx].copy()
    subset3['amount'] = subset3['oldbalanceOrg'] * 0.8
    subset3['newbalanceOrig'] = subset3['oldbalanceOrg'] + 2000
    
    # Combine back
    synthetic_batch = pd.concat([subset1, subset2, subset3])
    new_fraud_rows.append(synthetic_batch)
    print(f"  - Generated {len(synthetic_batch)} synthetic fraud rows for {t}")

# 3. Combine and shuffle
synthetic_df = pd.concat(new_fraud_rows, ignore_index=True)
augmented_df = pd.concat([df, synthetic_df], ignore_index=True)

# Shuffle the dataframe to distribute the continuous block of new records evenly
augmented_df = augmented_df.sample(frac=1, random_state=42).reset_index(drop=True)

print(f"\nAugmented dataset size: {len(augmented_df)} rows")

# Verify the fraud distribution
print("\nNew Fraud Distribution by Type:")
print(augmented_df.groupby('type')['isFraud'].sum())

# 4. Save the new dataset
print(f"\nSaving augmented dataset to {augmented_data_path}...")
augmented_df.to_csv(augmented_data_path, index=False)
print("Done!")
