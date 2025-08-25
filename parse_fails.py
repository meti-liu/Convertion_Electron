import sys
import csv
import json

def parse_fail_log(file_path):
    """Parses a CSV fail log to extract failure pin numbers or pairs."""
    failed_pin_groups = []
    try:
        with open(file_path, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                pin1_str = row.get('Pin1')
                pin2_str = row.get('Pin2')

                if pin1_str and pin1_str.isdigit():
                    pin1 = int(pin1_str)
                    # If Pin2 exists and is a number, create a pair
                    if pin2_str and pin2_str.isdigit():
                        pin2 = int(pin2_str)
                        failed_pin_groups.append([pin1, pin2])
                    # Otherwise, it's a single pin failure
                    else:
                        failed_pin_groups.append([pin1])
                # Handle cases where only Pin2 might exist (less common)
                elif pin2_str and pin2_str.isdigit():
                    failed_pin_groups.append([int(pin2_str)])

    except Exception as e:
        print(f"Error processing file {file_path}: {e}", file=sys.stderr)
        return []

    return failed_pin_groups

if __name__ == "__main__":
    # The first argument from command line is the file path
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        results = parse_fail_log(file_path)
        # Output the results as a JSON string to stdout
        print(json.dumps(results))
    else:
        print("Usage: python parse_fails.py <path_to_csv_file>", file=sys.stderr)