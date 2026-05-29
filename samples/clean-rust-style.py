# Clean Rust-style data processing (implemented in Python for comparison)

def read_data(filepath):
    with open(filepath, 'r') as f:
        return f.readlines()

def parse_record(line):
    parts = line.strip().split(',')
    if len(parts) < 3:
        return None
    return {'id': int(parts[0]), 'value': float(parts[1]), 'label': parts[2]}

def validate_record(record):
    if record is None:
        return False
    if record['value'] < 0:
        return False
    if not record['label']:
        return False
    return True

def transform_value(record, scale):
    return {**record, 'value': record['value'] * scale}

def compute_mean(values):
    if not values:
        return 0.0
    return sum(values) / len(values)

def compute_variance(values, mean):
    if not values:
        return 0.0
    return sum((v - mean) ** 2 for v in values) / len(values)

def partition_by_label(records):
    result = {}
    for r in records:
        label = r['label']
        if label not in result:
            result[label] = []
        result[label].append(r)
    return result

def analyze_partition(records):
    values = [r['value'] for r in records]
    mean = compute_mean(values)
    variance = compute_variance(values, mean)
    return {'count': len(records), 'mean': mean, 'variance': variance}

def format_result(label, analysis):
    return f"{label}: n={analysis['count']}, mean={analysis['mean']:.3f}, var={analysis['variance']:.3f}"

def process_file(filepath, scale=1.0):
    lines = read_data(filepath)
    parsed = [parse_record(l) for l in lines]
    valid = [p for p in parsed if validate_record(p)]
    transformed = [transform_value(r, scale) for r in valid]
    partitions = partition_by_label(transformed)
    analyses = {}
    for label, recs in partitions.items():
        analyses[label] = analyze_partition(recs)
    results = [format_result(l, a) for l, a in analyses.items()]
    return results

def main():
    results = process_file('data.csv', scale=2.0)
    for r in results:
        print(r)

main()
