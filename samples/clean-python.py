# Clean Python data processing pipeline

def read_data(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    return lines

def parse_line(line):
    parts = line.strip().split(',')
    return {'name': parts[0], 'value': float(parts[1]), 'category': parts[2]}

def filter_by_category(records, category):
    return [r for r in records if r['category'] == category]

def compute_average(records):
    if not records:
        return 0.0
    total = sum(r['value'] for r in records)
    return total / len(records)

def compute_median(records):
    values = sorted([r['value'] for r in records])
    n = len(values)
    if n % 2 == 0:
        return (values[n // 2 - 1] + values[n // 2]) / 2
    return values[n // 2]

def compute_stddev(records, mean):
    if not records:
        return 0.0
    variance = sum((r['value'] - mean) ** 2 for r in records) / len(records)
    return variance ** 0.5

def group_by_category(records):
    groups = {}
    for r in records:
        cat = r['category']
        if cat not in groups:
            groups[cat] = []
        groups[cat].append(r)
    return groups

def compute_stats(records):
    avg = compute_average(records)
    med = compute_median(records)
    std = compute_stddev(records, avg)
    return {'average': avg, 'median': med, 'stddev': std, 'count': len(records)}

def format_report(stats, category):
    lines = [
        f"=== Report for {category} ===",
        f"  Count:   {stats['count']}",
        f"  Average: {stats['average']:.2f}",
        f"  Median:  {stats['median']:.2f}",
        f"  StdDev:  {stats['stddev']:.2f}",
    ]
    return '\n'.join(lines)

def summarize_all(records):
    groups = group_by_category(records)
    reports = []
    for category, recs in groups.items():
        stats = compute_stats(recs)
        report = format_report(stats, category)
        reports.append(report)
    return '\n\n'.join(reports)

def run_pipeline(filepath):
    raw = read_data(filepath)
    records = [parse_line(line) for line in raw if line.strip()]
    report = summarize_all(records)
    return report

if __name__ == '__main__':
    print(run_pipeline('data.csv'))
