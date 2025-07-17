
(async () => {
    const CONFIG = {
        "Latest News (Tasnim)": "https://www.tasnimnews.com/fa/rss/feed/0/7/0/%D8%A2%D8%AE%D8%B1%DB%8C%D9%86-%D8%A7%D8%AE%D8%A8%D8%A7%D8%B1-%D8%A7%D8%AE%D8%A8%D8%A7%D8%B1-%D8%B1%D9%88%D8%B2",
        "Latest News (Shahrekhabar)": "https://www.shahrekhabar.com/rss.jsp?type=2",
        "Latest News (Mehrnews)": "https://www.mehrnews.com/rss",
        "Latest News (Khabaronline)": "https://www.khabaronline.ir/rss",
        "Latest News (yjc)": "https://www.yjc.ir/fa/rss/allnews",
        "Latest News (Parseek)": "https://www.parseek.com/rss/?type=IRAN",
    };

    const proxy = url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&t=${Date.now()}`;

    const getParagraphs = h2 => {
        const ps = [];
        let n = h2.nextElementSibling;
        while (n && n.tagName !== "H2") {
            if (n.tagName === "P") ps.push(n);
            if (n.tagName === "ASIDE") ps.push(...n.querySelectorAll("p"));
            n = n.nextElementSibling;
        }
        return ps;
    };

    const extractImageUrl = (item) => {
        const enclosure = item.querySelector("enclosure");
        if (enclosure && enclosure.getAttribute("url")) {
            return enclosure.getAttribute("url");
        }

        const mediaContent = item.querySelector("media\\:content, content");
        if (mediaContent && mediaContent.getAttribute("url")) {
            return mediaContent.getAttribute("url");
        }

        const description = item.querySelector("description")?.textContent || "";
        const imgMatch = description.match(/<img[^>]+src="([^">]+)"/i);
        return imgMatch ? imgMatch[1] : "";
    };

    const cleanDescription = (text) => {
        if (!text) return "";
        let clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const words = clean.split(/\s+/);
        return words.length > 4 ? words.slice(0, 3).join(' ') + '...' : clean;
    };

    async function fetchFeed(url, retries = 3) {
        try {
            const xmlText = await fetch(proxy(url)).then(r => r.text());
            const doc = new DOMParser().parseFromString(xmlText, "application/xml");
            const items = [...doc.querySelectorAll("item")];

            if (items.length === 0 && retries > 0) {
                console.warn(`Retrying feed due to empty result: ${url}`);
                return await fetchFeed(url, retries - 1);
            }

            return items.map(item => {
                const title = item.querySelector("title")?.textContent.trim() || "بدون عنوان";
                const link = item.querySelector("link")?.textContent.trim() || "#";
                const pubDate = item.querySelector("pubDate")?.textContent.trim() || "";
                const description = item.querySelector("description")?.textContent || "";

                return {
                    title,
                    link,
                    pubDate,
                    description: cleanDescription(description),
                    fullDescription: description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
                    imageUrl: extractImageUrl(item)
                };
            });
        } catch (e) {
            if (retries > 0) {
                console.warn(`Error fetching feed, retrying (${retries} left):`, e.message || e);
                await new Promise(res => setTimeout(res, 500));
                return await fetchFeed(url, retries - 1);
            } else {
                console.error("Failed to fetch feed after retries:", e.message || e);
                return [];
            }
        }
    }

    for (const [section, feedUrl] of Object.entries(CONFIG)) {
        const h2 = [...document.querySelectorAll("h2")].find(h => h.textContent.trim() === section);
        if (!h2) continue;

        const paragraphs = getParagraphs(h2);
        if (!paragraphs.length) continue;

        const items = (await fetchFeed(feedUrl)).slice(0, paragraphs.length);

        paragraphs.forEach((p, i) => {
            const item = items[i];
            if (!item) {
                p.style.display = "none";
                return;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'news-item';
            wrapper.style.marginBottom = '20px';
            wrapper.style.borderBottom = '1px solid #000';
            wrapper.style.paddingBottom = '15px';

            if (item.pubDate) {
                const dateDiv = document.createElement('div');
                dateDiv.className = 'news-date';
                dateDiv.textContent = item.pubDate;
                dateDiv.style.color = '#666';
                dateDiv.style.fontSize = '0.8em';
                dateDiv.style.marginBottom = '5px';
                wrapper.appendChild(dateDiv);
            }

            const link = document.createElement('a');
            link.href = item.link;
            link.target = '_blank';
            link.className = 'news-title';
            link.textContent = item.title;
            link.style.fontWeight = 'bold';
            link.style.fontSize = '1.1em';
            link.style.color = '#000';
            link.style.textDecoration = 'none';
            link.style.display = 'block';
            link.style.marginBottom = '8px';
            wrapper.appendChild(link);

            if (item.imageUrl) {
                const imgDiv = document.createElement('div');
                imgDiv.className = 'news-image-container';
                imgDiv.style.margin = '10px 0';

                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.alt = item.title;
                img.className = 'news-image';
                img.style.maxWidth = '100%';
                img.style.borderRadius = '4px';
                img.style.display = 'block';
                img.style.height = 'auto';

                imgDiv.appendChild(img);
                wrapper.appendChild(imgDiv);
            }

            const descDiv = document.createElement('div');
            descDiv.className = 'news-description';
            descDiv.style.color = '#444';
            descDiv.style.fontSize = '0.9em';
            descDiv.style.lineHeight = '1.5';

            const shortSpan = document.createElement('span');
            shortSpan.className = 'short-desc';
            shortSpan.textContent = item.description;

            const fullSpan = document.createElement('span');
            fullSpan.className = 'full-desc';
            fullSpan.textContent = item.fullDescription;
            fullSpan.style.display = 'none';

            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'toggle-desc-btn';
            toggleBtn.textContent = '...';

            toggleBtn.addEventListener('click', () => {
                const isShortVisible = shortSpan.style.display !== 'none';

                shortSpan.style.display = isShortVisible ? 'none' : 'inline';
                fullSpan.style.display = isShortVisible ? 'inline' : 'none';
                toggleBtn.textContent = isShortVisible ? 'Less' : '...';
            });

            descDiv.appendChild(shortSpan);
            descDiv.appendChild(fullSpan);
            descDiv.appendChild(toggleBtn);

            wrapper.appendChild(descDiv);

            p.innerHTML = '';
            p.appendChild(wrapper);
        });
    }
})();
////////////////////////////////////////////////////////////////////////////////
document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("article-sidebar");
    const menuUL = document.getElementById("article-menu");
    const backdrop = document.getElementById("backdrop");
    const articles = [...document.querySelectorAll("article")];

    articles.forEach((art, idx) => {
        const title = art.querySelector("p")?.textContent.trim() || `Article ${idx + 1}`;
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.textContent = title;
        btn.dataset.index = idx;
        li.appendChild(btn);
        menuUL.appendChild(li);
    });

    const buttons = [...menuUL.querySelectorAll("button")];

    function showArticle(i) {
        articles.forEach((a, idx) => a.classList.toggle("active", idx === i));
        buttons.forEach((b, idx) => b.classList.toggle("active", idx === i));
    }

    function openMenu() {
        toggle.classList.add("open");
        sidebar.classList.add("open");
        backdrop.classList.add("show");
    }
    function closeMenu() {
        toggle.classList.remove("open");
        sidebar.classList.remove("open");
        backdrop.classList.remove("show");
    }

    toggle.addEventListener("click", () =>
        sidebar.classList.contains("open") ? closeMenu() : openMenu()
    );
    backdrop.addEventListener("click", closeMenu);

    buttons.forEach(btn =>
        btn.addEventListener("click", () => {
            showArticle(+btn.dataset.index);
            closeMenu();
        })
    );

    if (articles.length) showArticle(0);
});



/*************************************************************************/
/*************************************************************************/
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const newsBlocks = document.querySelectorAll(".news-block");

        newsBlocks.forEach((block, index) => {
            const pTags = [...block.querySelectorAll("p")];
            const firstTextP = pTags.find(p => p.textContent.trim().length > 30);
            if (!firstTextP) return;

            const text = firstTextP.textContent.trim().replace(/\s+/g, " ");
            const desc = text.length > 160 ? text.slice(0, 157) + "..." : text;

            const meta = document.createElement("meta");
            meta.name = "description";
            meta.content = desc;
            meta.setAttribute("data-source", `news-block-${index}`);

            document.head.appendChild(meta);
        });
    }, 4000);
});


/******************************************* */
