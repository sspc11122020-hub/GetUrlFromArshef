const fs = require('fs');
const path = require('path');
const https = require('https');

const BLOG_URL = 'https://blogtomeya.blogspot.com/feeds/posts/default?alt=json&max-results=500';
const OUTPUT_DIR = path.join(__dirname, 'arsh');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fetchAndSeparatePosts() {
    console.log('🔄 جاري بدء استخراج المقالات وتأرشفتها في /arsh...');

    https.get(BLOG_URL, (res) => {
        let data = '';

        res.on('data', (chunk) => { data += chunk; });

        res.on('end', () => {
            try {
                const parsedData = JSON.parse(data);
                const entries = parsedData.feed.entry || [];

                if (entries.length === 0) {
                    console.log('⚠️ لم يتم العثور على أي مقالات!');
                    return;
                }

                // فرز المقالات من الأقدم إلى الأحدث
                entries.sort((a, b) => {
                    const dateA = new Date(a.published && a.published['$t'] ? a.published['$t'] : 0);
                    const dateB = new Date(b.published && b.published['$t'] ? b.published['$t'] : 0);
                    return dateA - dateB;
                });

                let newPostsCount = 0;
                let skippedCount = 0;
                const indexList = [];

                entries.forEach((entry, index) => {
                    const rawId = entry.id && entry.id['$t'] ? entry.id['$t'] : '';
                    const idMatch = rawId.match(/post-(\d+)/);
                    const postId = idMatch ? idMatch[1] : `item-${index + 1}`;
                    const fileName = `post-${postId}.json`;
                    const filePath = path.join(OUTPUT_DIR, fileName);

                    const title = entry.title && entry.title['$t'] ? entry.title['$t'] : 'بدون عنوان';
                    const linkObj = entry.link ? entry.link.find((l) => l.rel === 'alternate') : null;
                    const url = linkObj ? linkObj.href : '#';

                    // استخراج الصور مع تجنب أخطاء الترميز
                    let thumbnail = 'https://via.placeholder.com/600x400/1f1f1f/ffffff?text=SeSo';
                    
                    const mediaThumb = entry['media\$thumbnail'];
                    if (mediaThumb && mediaThumb.url) {
                        thumbnail = mediaThumb.url.replace(/\/s[0-9]+(-c)?\//, '/s1600/');
                    } else if (entry.content && entry.content['\$t']) {
                        const imgMatch = entry.content['\$t'].match(/src="([^"]+)"/);
                        if (imgMatch) thumbnail = imgMatch[1];
                    }

                    const categories = entry.category ? entry.category.map((c) => c.term) : ['تطبيقات'];
                    const publishedAt = entry.published && entry.published['$t'] ? entry.published['$t'] : new Date().toISOString();
                    const content = entry.content && entry.content['$t'] ? entry.content['$t'] : (entry.summary && entry.summary['$t'] ? entry.summary['$t'] : '');

                    const postData = {
                        id: postId,
                        orderIndex: index + 1,
                        title: title,
                        url: url,
                        thumbnail: thumbnail,
                        categories: categories,
                        mainCategory: categories[0] || 'عام',
                        publishedAt: publishedAt,
                        content: content
                    };

                    indexList.push({
                        id: postId,
                        orderIndex: index + 1,
                        title: title,
                        url: url,
                        thumbnail: thumbnail,
                        mainCategory: categories[0] || 'عام',
                        publishedAt: publishedAt,
                        jsonFile: `/arsh/${fileName}`
                    });

                    if (!fs.existsSync(filePath)) {
                        fs.writeFileSync(filePath, JSON.stringify(postData, null, 2), 'utf-8');
                        newPostsCount++;
                    } else {
                        skippedCount++;
                    }
                });

                fs.writeFileSync(
                    path.join(OUTPUT_DIR, 'index.json'),
                    JSON.stringify({
                        totalPosts: indexList.length,
                        updatedAt: new Date().toISOString(),
                        posts: indexList
                    }, null, 2),
                    'utf-8'
                );

                console.log(`✅ اكتملت العملية بنجاح!`);
                console.log(`🔹 مقالات جديدة: ${newPostsCount}`);
                console.log(`🔹 مقالات سابقة: ${skippedCount}`);

            } catch (error) {
                console.error('❌ حدث خطأ أثناء تحليل البيانات:', error.message);
                process.exit(1);
            }
        });

    }).on('error', (err) => {
        console.error('❌ حدث خطأ في الاتصال:', err.message);
        process.exit(1);
    });
}

fetchAndSeparatePosts();
