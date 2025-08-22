import sys
import csv
import json

def parse_fail_log(file_path):
    """Parses a CSV fail log to extract failure pin numbers."""
    failed_pins = []
    try:
        with open(file_path, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Extract pin numbers from Pin1 and Pin2, which are the most reliable
                pin1 = row.get('Pin1')
                pin2 = row.get('Pin2')
                error_type = row.get('Item', 'UNKNOWN')

                if pin1 and pin1.isdigit():
                    failed_pins.append({"pin": int(pin1), "error_type": error_type})
                if pin2 and pin2.isdigit():
                    failed_pins.append({"pin": int(pin2), "error_type": error_type})

    except Exception as e:
        # If there's an error, print it to stderr for Electron to catch
        print(f"Error processing file {file_path}: {e}", file=sys.stderr)
        return []

    return failed_pins

if __name__ == "__main__":
    # The first argument from command line is the file path
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        results = parse_fail_log(file_path)
        # Output the results as a JSON string to stdout
        print(json.dumps(results))
    else:
        print("Usage: python parse_fails.py <path_to_csv_file>", file=sys.stderr)