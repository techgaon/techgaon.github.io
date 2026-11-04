# Panchayt News

Production path: https://techgaon.in/panchaytnews/

Buildless mobile-first news reader. English interface; Hindi default news with Awadhi (`awa`), Bhojpuri (`bho`) and Haryanvi (`bgc`) translations. Opens directly into the feed. Touch swipes, wheel and arrow keys navigate. Long summaries scroll inside the card before advancing. Summaries must remain at most 100 whitespace-separated words in every language. Photo credits distinguish representative visuals from actual events.

`news.json` is the published feed. Its records remain in the repository; automatic updates must merge and deduplicate, not replace all older stories. Retain up to 300 stories, newest first. `publishedAt` is the verified original source publication timestamp (never retrieval time). `updatedAt` is the actual feed update timestamp. A draft/proposal must not become an approved order in a summary or translation. Source links must target the exact article or video, not a homepage or search page.

Schema: `{version:1, updatedAt: ISO8601, articles:[{id,title,summary,source,url,publishedAt,category,states:[],districts:[{state,name}],sourceType:'article'|'video',image,imageAlt,imageCredit,translations:{awa:{title,summary},bho:{title,summary},bgc:{title,summary}}}]}`. Geography values match `regions.json` exactly. Nationwide news uses empty states and districts; state-wide news has no districts. Do not tag the district of a dateline as the scope of a state-wide policy. Unavailable district results show an honest empty state. Language fallback is visibly disclosed.

The authorized ChatGPT scheduled publisher researches sources and updates `news.json` through the connected GitHub account. No paid API key or browser secret is embedded in the app. Publication depends on that schedule, connected GitHub access and the repository's existing Pages deployment. A browser refresh alone does not research news. A client refresh runs every 5 minutes without disrupting the current story.

Last fetched feed is stored locally for immediate/offline reading; bookmarks store complete summaries separately. The service worker caches the app and JSON (only within this app's directory) using a network-first strategy. Publisher pages and videos require connectivity and are opened at their original URLs. Next three images are prefetched. This is a web app, not an Android binary.

District dropdown data: CodingMation/indian-states-districts, `data/india_states_districts.json` (snapshot retrieved 2026-11-04). Includes 36 states/UTs and 779 district entries; this is a convenience dataset, not an authoritative current LGD register. Review when administrative boundaries change.

No dependencies/build step. Serve this directory with any HTTP static server. Run `node --check app.js` and `node --check sw.js` before release. Preserve the main TechGaon website and unrelated app paths.
