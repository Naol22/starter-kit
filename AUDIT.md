After running a full 5-angle Discovery Scan on dentalscan.us, here's what stood out both as a user and as an engineer thinking about mobile camera flows.

What could be smoother

1. Camera warm-up feels frozen. From tapping "Start Scan" to the live feed appearing took several seconds with no visible progress. On mobile users will retap or bail. A shimmer placeholder or a concrete "Waking up camera…" status, plus a timeout fallback , would make the wait feel intentional.

2. Coverage detection is too generous. When I deliberately showed only a partial view of my teeth letting my lip or cheek cover most of the frame the system still accepted it as a valid capture. 

3. Privacy: the full face is captured, not just the teeth. The scan stores the entire facial frame even though only the mouth region is clinically meaningful. For healthcare-adjacent data this is unnecessary PII exposure. Cropping to a tight mouth region ideally client-side before upload would reduce the PII surface, shrink payloads, and lower storage cost, without affecting diagnostic quality.

4. Low-light scans: no flash prompt or exposure hint; indoor captures are noisy.

