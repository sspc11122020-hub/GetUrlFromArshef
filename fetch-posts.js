const fs = require('fs');
const path = require('path');
const https = require('https');

const BLOG_URL = 'https://blogtomeya.blogspot.com/feeds/posts/default?alt=json&max-results=500';
const OUTPUT_DIR = path.join(__dirname, 'arsh');

// إنشاء مجلد arsh إن لم يكن موجوداً
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

                // 1. فرز المقالات وتعديل الترتيب ليكون من الأقدم إلى الأحدث
                entries.sort((a, b) => {
                    const dateA = new Date(a.published ? a.published.\$t : 0);
                    const dateB = new Date(b.published ? b.published.\$t : 0);
                    return dateA - dateB; // الأقدم أولاً
                });

                let newPostsCount = 0;
                let skippedCount = 0;
                const indexList = [];

                // 2. معالجة كل مقال وحفظه في ملف منفصل
                entries.forEach((entry, index) => {
                    // استخراج معرف المقال الفريد (Post ID)
                    const idMatch = entry.id.\$t.match(/post-(\d+)/);
                    const postId = idMatch ? idMatch[1] : `item-${index + 1}`;
                    const fileName = `post-${postId}.json`;
                    const filePath = path.join(OUTPUT_DIR, fileName);

                    const title = entry.title ? entry.title.\$t : 'بدون عنوان';
                    const linkObj = entry.link ? entry.link.find((l) => l.rel === 'alternate') : null;
                    const url = linkObj ? linkObj.href : '#';

                    // استخراج الصورة المصغرة وتكبير جودتها
                    let thumbnail = 'https://via.placeholder.com/600x400/1f1f1f/ffffff?text=SeSo';
                    if (entry.media$thumbnail && entry.media$thumbnail.url) {
                        thumbnail = entry.media\$thumbnail.url.replace(/\/s[0-9]+(-c)?\//, '/s1600/');
                    } else if (entry.content && entry.content.\$t) {
                        const imgMatch = entry.content.\$t.match(/src="([^"]+)"/);
                        if (imgMatch) thumbnail = imgMatch[1];
                    }

                    const categories = entry.category ? entry.category.map((c) => c.term) : ['تطبيقات'];
                    const publishedAt = entry.published ? entry.published.\$t : new Date().toISOString();
                    const content = entry.content ? entry.content.$t : (entry.summary ? entry.summary.$t : '');

                    const postData = {
                        id: postId,
                        orderIndex: index + 1, // رقم المقال التسلسلي (1 للأقدم)
                        title: title,
                        url: url,
                        thumbnail: thumbnail,
                        categories: categories,
                        mainCategory: categories[0] || 'عام',
                        publishedAt: publishedAt,
                        content: content
                    };

                    // إضافة المقال لفهرس الأرشيف الشامل
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

                    // 3. التحقق من وجود الملف مسبقاً لمنع التكرار
                    if (!fs.existsSync(filePath)) {
                        fs.writeFileSync(filePath, JSON.stringify(postData, null, 2), 'utf-8');
                        newPostsCount++;
                    } else {
                        skippedCount++;
                    }
                });

                // 4. حفظ ملف الفهرس الشامل داخل مجلد arsh
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
                console.log(`🔹 مقالات جديدة تم إنشاؤها: ${newPostsCount}`);
                console.log(`🔹 مقالات تم تجاوزها (موجودة مسبقاً): ${skippedCount}`);
                console.log(`📁 تم تحديث ملف الفهرس: arsh/index.json`);

            } catch (error) {
                console.error('❌ حدث خطأ أثناء تحليل بيانات بلوجر:', error.message);
                process.exit(1);
            }
        });

    }).on('error', (err) => {
        console.error('❌ حدث خطأ أثناء الاتصال بالسيرفر:', err.message);
        process.exit(1);
    });
}

fetchAndSeparatePosts();
