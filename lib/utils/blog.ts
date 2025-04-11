export const blogTemplate = (name: string) => `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Blog</title><style>body{font-family:Arial,sans-serif;background-color:#000;margin:0;padding:0}main{width:800px;max-width:100%;margin:0 auto;padding:20px}aside{background-color:#1a1c2d;border-radius:10px;padding:10px;display:flex;margin-bottom:10px;gap:8px}aside img{width:60px;height:60px;display:block;border-radius:100%}aside h1{color:#fff;word-break:break-all;display:flex;align-items:center;font-size:18px}.tweet{width:100%;background-color:#1a1c2d;border-radius:10px;padding:15px;margin-bottom:10px;box-shadow:0 2px 5px rgba(0,0,0,.1);transition:all .3s ease;box-sizing:border-box}.tweet:hover{box-shadow:0 4px 10px rgba(0,0,0,.2)}.tweet .time{color:#657786;text-align:right;font-size:12px}.tweet .content{color:#fff;font-size:16px;margin-bottom:6px}</style><script type="module">const getName = () => {
      const { hostname } = window.location;
      if (hostname.indexOf('onl') > -1) {
        return hostname.replace('.onl', '');
      } else {
        return undefined;
      }
    }
    const name = getName() || '${name}';
    document.title = \`BLob | \${name}\`;
    const getTweets = async () => {
      try {
        const res = await fetch(\`https://apidev.sat20.org/testnet4/ns/values/\${name}/blog\`)
        const data = await res.json()
        const a = data?.data?.kvs || []
        return a.map(kv => ({
          t: kv.key.replace('blog_', ''),
          c: kv.value
        }));
      } catch (error) {
        return [];
      }
    }
    const getPersonalInfo = async () => {
      try {
        const res = await fetch(\`https://apidev.sat20.org/testnet4/ns/values/\${name}/personal\`)
        const data = await res.json()
        const a = data?.data?.kvs || []
        const avatar = a.find(kv => kv.key === 'personal_avatar')?.value || 'https://ordx.market/logo.png';
        const userName = a.find(kv => kv.key === 'personal_name')?.value || name;
        return {
          avatar,
          name: userName
        }
      } catch (error) {
        return {
          avatar: 'https://ordx.market/logo.png',
          name,
        };
      }
    }
    document.addEventListener('DOMContentLoaded', async () => {
      function renderPersonalInfo(info) {
        const { avatar, name } = info;
        const aside = document.querySelector('aside');
        aside.querySelector('img').src = avatar;
        aside.querySelector('h1').textContent = name;
      }
      const personalInfo = await getPersonalInfo();
      renderPersonalInfo(personalInfo);
      const tweets = await getTweets();
      function renderTweets(tweets) {
        const tweetContainer = document.getElementById('tweetContainer');
        tweets.forEach(tweet => {
          const time = new Date(parseInt(tweet.t)).toLocaleString();
          const tweetElement = document.createElement('div');
          tweetElement.className = 'tweet';
          tweetElement.innerHTML = \`
            <div class="content">
              \${tweet.c}.
            </div>
             <div class="time">
              \${time}
            </div>
          \`;
          tweetContainer.appendChild(tweetElement);
        });
      }
      
      renderTweets(tweets);
    });</script></head><body><main><aside><img><h1></h1></aside><section id="tweetContainer"></section></main></body></html>`;
