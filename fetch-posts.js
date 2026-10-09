const fs = require('fs');
const https = require('https');

// رابط مدونتك المستهدفة على بلوجر
const BLOG_URL = 'https://blogtomeya.blogspot.com/feeds/posts/default?alt=json&max-results=150';

function fetchBloggerPosts() {
    console.log('🔄 جاري بدء استخراج المقالات من بلوجر...');

    https.get(BLOG_URL, (res) => {
        let data = '';

        // تجميع الحزم المستقبلة
        res.on('data', (chunk) => {
            data += chunk;
        });

        // عند انتهاء التحميل
        res.on('end', () => {
            try {
                const parsedData = JSON.parse(data);
                const entries = parsedData.feed.entry || [];

                if (entries.length === 0) {
                    console.log('⚠️ لم يتم العثور على مقالات!');
                    return;
                }

                // هيكلة وتنظيف البيانات المستخرجة
                const posts = entries.map((entry) => {
                    const title = entry.title ? entry.title.\$t : 'بدون عنوان';
                    
                    // استخراج الرابط المباشر للمقال
                    const linkObj = entry.link.find((l) => l.rel === 'alternate');
                    const url = linkObj ? linkObj.href : '#';

                    // استخراج وتكبير جودة الصورة المصغرة
                    let thumbnail = 'https://via.placeholder.com/600x400/1f1f1f/ffffff?text=SeSo';
                    if (entry.media$thumbnail && entry.media$thumbnail.url) {
                        thumbnail = entry.media\$thumbnail.url.replace(/\/s[0-9]+(-c)?\//, '/s1600/');
                    } else if (entry.content && entry.content.\$t) {
                        const imgMatch = entry.content.\$t.match(/src="([^"]+)"/);
                        if (imgMatch) {
                            thumbnail = imgMatch[1];
                        }
                    }

                    // استخراج التصنيفات
                    const categories = entry.category 
                        ? entry.category.map((c) => c.term) 
                        : ['تطبيقات'];

                    // استخراج وتنسيق التاريخ
                    const publishedAt = entry.published ? entry.published.\$t : new Date().toISOString();

                    return {
                        id: entry.id.\$t,
                        title: title,
                        url: url,
                        thumbnail: thumbnail,
                        categories: categories,
                        mainCategory: categories[0] || 'عام',
                        publishedAt: publishedAt
                    };
                });

                // كتابة وحفظ البيانات في ملف posts.json
                fs.writeFileSync('posts.json', JSON.stringify({
                    updatedAt: new Date().toISOString(),
                    totalPosts: posts.length,
                    posts: posts
                }, null, 2), 'utf-8');

                console.log(`✅ تم استخراج ${posts.length} مقال بنجاح وحفظهم في ملف posts.json!`);

            } catch (error) {
                console.error('❌ حدث خطأ أثناء تحليل البيانات:', error.message);
                process.exit(1);
            }
        });

    }).on('error', (err) => {
        console.error('❌ حدث خطأ أثناء جلب البيانات من السيرفر:', err.message);
        process.exit(1);
    });
}

fetchBloggerPosts();
