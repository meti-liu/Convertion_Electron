import sys
import json
import re

def parse_fail_log_txt(content):
    """
    Parses a .txt fail log file, extracting pin failures based on different failure types.
    Handles single pins, pin pairs, and special formats like SILVER FAIL.
    """
    fails = {}
    current_fail_type = None
    fail_sections = re.split(r'(<<\s*.*?\s*FAIL\s*>>)', content)

    for i in range(1, len(fail_sections), 2):
        header = fail_sections[i]
        body = fail_sections[i+1]
        
        if 'LEAK FAIL' in header or 'SPARK FAIL' in header:
            current_fail_type = 'LEAK' if 'LEAK FAIL' in header else 'SPARK'
            # Extracts single pin numbers, e.g., "1500"
            pins = re.findall(r'^\s*(\d+)\s*$', body, re.MULTILINE)
            for pin in pins:
                pin_int = int(pin)
                if pin_int not in fails:
                    fails[pin_int] = {'type': current_fail_type, 'pair': []}

        elif 'OPEN FAIL' in header or 'WRu-SHORT FAIL' in header:
            current_fail_type = 'OPEN' if 'OPEN FAIL' in header else 'WRu-SHORT'
            # Extracts pin pairs, e.g., "1500 - 1501"
            pairs = re.findall(r'^\s*(\d+)\s*-\s*(\d+)\s*$', body, re.MULTILINE)
            for p1, p2 in pairs:
                p1_int, p2_int = int(p1), int(p2)
                # Store as a pair
                if p1_int not in fails:
                    fails[p1_int] = {'type': current_fail_type, 'pair': [p2_int]}
                if p2_int not in fails:
                    fails[p2_int] = {'type': current_fail_type, 'pair': [p1_int]}

        elif 'SILVER FAIL' in header:
            current_fail_type = 'SILVER'
            # Extracts pins from "-F" and "+F" identifiers
            # e.g., "1:-F1600 ,S1601   +F94446 ,S1602" -> (1600, 94446)
            pairs = re.findall(r'-F(\d+).*?\+F(\d+)', body)
            for p1, p2 in pairs:
                p1_int, p2_int = int(p1), int(p2)
                if p1_int not in fails:
                    fails[p1_int] = {'type': current_fail_type, 'pair': [p2_int]}
                if p2_int not in fails:
                    fails[p2_int] = {'type': current_fail_type, 'pair': [p1_int]}

    # Convert to the desired list format
    output = []
    processed_pins = set()
    for pin, data in fails.items():
        if pin in processed_pins:
            continue
        
        pins = [pin] + data['pair']
        output.append({
            'pins': sorted(list(set(pins))),
            'type': data['type']
        })
        for p in pins:
            processed_pins.add(p)
            
    return output

def parse_fail_log_csv(content):
    """
    Parses a .csv fail log file (tab-delimited), extracting pin failures.
    """
    fails = {}
    lines = content.strip().split('\n')
    
    # Skip header if it exists
    start_line = 1 if 'No.' in lines[0] else 0

    for line in lines[start_line:]:
        parts = line.strip().split('\t')
        if len(parts) < 9:
            continue

        fail_type = parts[6].strip()  # Item
        pin1_str = parts[7].strip()   # Pin1
        pin2_str = parts[8].strip()   # Pin2

        if fail_type in ['OPEN', 'WRu-SHORT', 'SILVER']:
            if pin1_str.isdigit() and pin2_str.isdigit():
                p1_int, p2_int = int(pin1_str), int(pin2_str)
                if p1_int not in fails:
                    fails[p1_int] = {'type': fail_type, 'pair': [p2_int]}
                if p2_int not in fails:
                    fails[p2_int] = {'type': fail_type, 'pair': [p1_int]}
        elif fail_type in ['SPARK', 'LEAK']:
            if pin1_str.isdigit():
                pin_int = int(pin1_str)
                if pin_int not in fails:
                    fails[pin_int] = {'type': fail_type, 'pair': []}

    # Convert to the desired list format
    output = []
    processed_pins = set()
    for pin, data in fails.items():
        if pin in processed_pins:
            continue
        
        pins = [pin] + data['pair']
        output.append({
            'pins': sorted(list(set(pins))),
            'type': data['type']
        })
        for p in pins:
            processed_pins.add(p)

    return output

def main():
    """
    Main function to read file path from command line arguments,
    parse the file, and print the JSON output.
    """
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}), file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(json.dumps({"error": f"File not found: {file_path}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Error reading file: {e}"}), file=sys.stderr)
        sys.exit(1)

    results = []
    if file_path.lower().endswith('.txt'):
        results = parse_fail_log_txt(content)
    elif file_path.lower().endswith('.csv'):
        results = parse_fail_log_csv(content)
    else:
        print(json.dumps({"error": "Unsupported file type"}), file=sys.stderr)
        sys.exit(1)
        
    print(json.dumps(results, indent=4))

if __name__ == '__main__':
    main()