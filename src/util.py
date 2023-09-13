import csv
import json
import os

# Define the input and output file paths
input_dir = 'inventory_export'
output_file = 'inventory.jsonl'

# Define the field names for the CSV file
field_names = ['PartNumber', 'UPC', 'SKU', 'QuantityOnHand', 'QuantityAvailable', 'SafetyStock', 'Floor', 'LTD', 'LocationCode', 'LocationName', 'LocationActive', 'DirectShip', 'TransferEnabled', 'Pickup']

# Define the field names for the JSONL file
jsonl_field_names = ['locationName', 'locationCode', 'tenantID', 'onHand', 'available', 'allocated', 'pending', 'upc', 'blockAssignment', 'ltd', 'floor', 'safetyStock', 'distance', 'directShip', 'transferEnabled', 'pickup', 'countryCode']

# Open the output file for writing
with open(output_file, 'w') as f:
    # Loop through each file in the input directory
    for filename in os.listdir(input_dir):
        if filename.endswith('.csv'):
            # Open the CSV file for reading
            with open(os.path.join(input_dir, filename), 'r') as csvfile:
                # Create a CSV reader object
                reader = csv.DictReader(csvfile, fieldnames=field_names)
                # Skip the header row
                next(reader)
                # Loop through each row in the CSV file
                for row in reader:
                    # Create a dictionary for the JSONL file
                    jsonl_dict = {}
                    jsonl_dict['locationName'] = row['LocationName']
                    jsonl_dict['locationCode'] = row['LocationCode']
                    jsonl_dict['tenantID'] = 100016
                    jsonl_dict['onHand'] = int(row['QuantityOnHand'])
                    jsonl_dict['available'] = int(row['QuantityAvailable'])
                    jsonl_dict['allocated'] = 0
                    jsonl_dict['pending'] = 0
                    jsonl_dict['upc'] = row['UPC']
                    jsonl_dict['blockAssignment'] = False
                    jsonl_dict['ltd'] = int(row['LTD']) if row['LTD'] else 0
                    jsonl_dict['floor'] = int(row['Floor']) if row['Floor'] else 0
                    jsonl_dict['safetyStock'] = int(row['SafetyStock']) if row['SafetyStock'] else 0
                    jsonl_dict['distance'] = 0
                    jsonl_dict['directShip'] = bool(int(row['DirectShip']))
                    jsonl_dict['transferEnabled'] = bool(int(row['TransferEnabled']))
                    jsonl_dict['pickup'] = bool(int(row['Pickup']))
                    jsonl_dict['countryCode'] = 'AE'
                    # Write the JSONL record to the output file
                    f.write(json.dumps(jsonl_dict) + '\n')