import { UserStorage, BlogStorage, CategoryStorage, generateId } from './storage';
import { User, Blog, Category } from '@/types';

// 初始化示例数据
export function initializeSampleData() {
  // 检查是否已经初始化过数据
  const existingUsers = UserStorage.getUsers();
  if (existingUsers.length > 0) {
    return; // 如果已有数据，不重复初始化
  }

  // 创建示例用户
  const demoUser: User = {
    id: 'demo-user-1',
    username: '博客达人',
    email: 'demo@example.com',
    password: 'demo123',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    registerTime: new Date('2024-01-01').toISOString(),
  };

  const techUser: User = {
    id: 'tech-user-1',
    username: '技术小白',
    email: 'tech@example.com',
    password: 'tech123',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
    registerTime: new Date('2024-02-01').toISOString(),
  };

  // 保存用户
  UserStorage.addUser(demoUser);
  UserStorage.addUser(techUser);

  // 创建示例博客
  const sampleBlogs: Blog[] = [
    {
      id: generateId(),
      title: 'React 18 新特性详解：并发渲染与自动批处理',
      content: `# React 18 新特性详解

React 18 是一个重要的版本更新，带来了许多令人兴奋的新特性。让我们一起深入了解这些新功能。

## 1. 并发渲染 (Concurrent Rendering)

并发渲染是 React 18 最重要的新特性之一。它允许 React 在渲染过程中暂停、恢复或放弃工作，从而保持应用的响应性。

### 特点：
- **可中断的渲染**：React 可以在需要时暂停渲染工作
- **优先级调度**：高优先级的更新会打断低优先级的更新
- **时间切片**：将渲染工作分解为小块，避免阻塞主线程

## 2. 自动批处理 (Automatic Batching)

在 React 18 中，所有的状态更新都会被自动批处理，无论它们发生在哪里。

\`\`\`javascript
// React 18 中，这些更新会被自动批处理
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // 只会重新渲染一次
}, 1000);
\`\`\`

## 3. 新的 Hook

### useDeferredValue
用于延迟更新非紧急的状态：

\`\`\`javascript
function SearchPage({ query }) {
  const deferredQuery = useDeferredValue(query);
  // deferredQuery 会在紧急更新完成后更新
  return <SearchResults query={deferredQuery} />;
}
\`\`\`

### useTransition
用于标记非紧急的状态更新：

\`\`\`javascript
function TabContainer() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState('about');

  function selectTab(nextTab) {
    startTransition(() => {
      setTab(nextTab);
    });
  }
}
\`\`\`

## 4. Suspense 的改进

React 18 中的 Suspense 更加强大，支持服务端渲染和数据获取。

## 总结

React 18 为我们带来了更好的用户体验和开发体验。并发特性让应用更加流畅，自动批处理提高了性能，新的 Hook 给了我们更多控制权。

升级到 React 18 是值得的投资！`,
      summary: 'React 18 带来了并发渲染、自动批处理等重要新特性，让我们的应用更加流畅和高效。本文将详细介绍这些新功能的使用方法和最佳实践。',
      category: '技术',
      tags: ['React', 'JavaScript', '前端', '并发渲染'],
      authorId: techUser.id,
      authorName: techUser.username,
      createTime: new Date('2024-06-15').toISOString(),
      updateTime: new Date('2024-06-15').toISOString(),
      status: 'published',
      views: 234,
    },
    {
      id: generateId(),
      title: '我的日本关西之旅：京都、大阪、奈良的美好回忆',
      content: `# 关西之旅：一场心灵的洗礼

这次的日本关西之旅，是我期待已久的旅程。京都的古典美、大阪的现代活力、奈良的自然和谐，每一个地方都给我留下了深刻的印象。

## 京都：千年古都的魅力

### 清水寺的日出
早上6点，我爬上清水寺，看着朝阳缓缓升起，金色的光芒洒在古老的木质建筑上，那一刻仿佛穿越了时空。

### 伏见稻荷大社的千本鸟居
漫步在红色的鸟居隧道中，每一步都充满了神秘感。阳光透过鸟居的缝隙洒下来，形成了美丽的光影。

### 岚山竹林
竹林中的小径宁静而幽深，风吹过竹叶的声音就像天然的音乐，让人心灵得到净化。

## 大阪：美食与活力的都市

### 道顿堀的夜晚
霓虹灯闪烁的道顿堀，是大阪最具代表性的景象。这里有最正宗的章鱼烧、大阪烧，还有热情的大阪人。

### 大阪城
站在大阪城天守阁上，俯瞰整个城市，感受着历史与现代的完美融合。

## 奈良：与小鹿的邂逅

### 奈良公园
在奈良公园，我遇到了许多可爱的小鹿。它们温顺友好，会主动来要鹿饼，那种与自然和谐相处的感觉太美好了。

### 东大寺
巨大的佛像让人震撼，古老的建筑诉说着千年的历史。

## 旅行感悟

这次旅行让我深深感受到了日本文化的魅力：
- **细致入微**：从服务到产品，每个细节都精益求精
- **传统与现代并存**：古老的寺庙与现代的城市和谐共存
- **自然与人文的平衡**：人与自然、人与环境的和谐关系

旅行不仅是看风景，更是心灵的成长。每一次出发，都是为了更好的回归。`,
      summary: '记录我在日本关西地区的美好旅程，从京都的古典雅致到大阪的现代活力，再到奈良与小鹿的温馨邂逅，每一个瞬间都值得珍藏。',
      category: '旅行',
      tags: ['日本', '关西', '京都', '大阪', '奈良', '旅行'],
      authorId: demoUser.id,
      authorName: demoUser.username,
      createTime: new Date('2024-06-10').toISOString(),
      updateTime: new Date('2024-06-10').toISOString(),
      status: 'published',
      views: 189,
    },
    {
      id: generateId(),
      title: '家常菜的温暖：妈妈教我做的红烧肉',
      content: `# 妈妈的红烧肉：家的味道

每当想家的时候，我就会想起妈妈做的红烧肉。那种甜而不腻、软烂入味的口感，是世界上最温暖的味道。

## 食材准备

### 主料：
- 五花肉 500g（选择肥瘦相间的）
- 生抽 3勺
- 老抽 1勺（调色用）
- 冰糖 20g
- 料酒 2勺

### 配菜：
- 香葱 2根
- 生姜 3片
- 八角 2个
- 桂皮 1小块

## 制作步骤

### 1. 处理肉块
将五花肉切成2cm见方的块状，不要太小，炖煮后会缩水。

### 2. 焯水去腥
冷水下锅，加入料酒和姜片，煮开后撇去浮沫，捞出备用。

### 3. 炒糖色
锅中放少许油，下冰糖小火炒至焦糖色，这是红烧肉颜色诱人的关键。

### 4. 炒肉上色
下肉块翻炒，让每一块肉都裹上糖色。

### 5. 调味炖煮
加入生抽、老抽、料酒，倒入温水没过肉块，放入香料，大火烧开转小火慢炖45分钟。

### 6. 收汁
最后大火收汁，让汤汁浓稠有光泽。

## 小贴士

1. **选肉很重要**：五花肉要选肥瘦相间的，这样做出来口感最好
2. **炒糖色的火候**：一定要小火，糖色炒过头会发苦
3. **炖煮时间**：慢炖是关键，至少45分钟才能软烂
4. **收汁技巧**：最后收汁时要不停翻炒，避免糊底

## 情感的味道

每次做这道菜，我都会想起妈妈在厨房忙碌的身影。她总是说："做菜要用心，心意到了，味道就对了。"

现在我也会做红烧肉了，但总觉得少了点什么。后来我明白了，少的是妈妈的爱和家的温暖。

食物不仅是味觉的享受，更是情感的寄托。每一道家常菜背后，都有着深深的爱意和美好的回忆。`,
      summary: '分享妈妈教我的红烧肉做法，不仅有详细的制作步骤，更有浓浓的家的味道和温暖的回忆。食物承载着情感，每一口都是爱的味道。',
      category: '美食',
      tags: ['家常菜', '红烧肉', '妈妈的味道', '烹饪'],
      authorId: demoUser.id,
      authorName: demoUser.username,
      createTime: new Date('2024-06-08').toISOString(),
      updateTime: new Date('2024-06-08').toISOString(),
      status: 'published',
      views: 156,
    },
    {
      id: generateId(),
      title: '读《活着》有感：生命的坚韧与人性的光辉',
      content: `# 《活着》：在苦难中看见希望

余华的《活着》是一本让人既心痛又感动的小说。通过福贵的一生，我们看到了生命的坚韧，也看到了人性的光辉。

## 故事梗概

福贵原本是个地主家的少爷，因为赌博败光了家产，从此开始了颠沛流离的一生。在历史的洪流中，他失去了父亲、母亲、妻子、儿子、女儿，最后只剩下一头老牛与他相伴。

## 深层思考

### 1. 生命的意义
福贵经历了人生所有的苦难，但他依然选择活着。这让我思考：活着本身就是生命的意义。

### 2. 苦难与成长
每一次打击都让福贵变得更加坚强。苦难不会让人变得更好，但会让人变得更加坚韧。

### 3. 人性的复杂
小说中的人物都很复杂，没有绝对的好人和坏人，只有在特定环境下的选择。

## 印象深刻的片段

> "人是为了活着本身而活着，而不是为了活着之外的任何事物而活着。"

这句话深深震撼了我。在我们追求各种目标的时候，往往忘记了活着本身就是最大的意义。

## 现实启示

### 珍惜当下
读完这本书，我更加珍惜现在的生活。健康的身体、温暖的家庭、稳定的工作，这些平凡的幸福原来如此珍贵。

### 坚韧不屈
面对困难时，想想福贵的经历，我们遇到的挫折其实都不算什么。

### 善待他人
每个人都有自己的苦难，多一些理解和宽容，世界会更美好。

## 总结

《活着》不是一本轻松的小说，但它是一本值得反复阅读的好书。它让我们思考生命、思考人性、思考活着的意义。

在这个快节奏的时代，我们更需要这样的书来提醒我们：简单地活着，就已经很了不起了。`,
      summary: '读余华《活着》的深度感悟，探讨生命的意义、苦难与成长、人性的复杂。这本书让我们重新思考活着本身的价值，珍惜平凡而珍贵的幸福。',
      category: '读书',
      tags: ['余华', '活着', '文学', '人生感悟', '读书笔记'],
      authorId: demoUser.id,
      authorName: demoUser.username,
      createTime: new Date('2024-06-05').toISOString(),
      updateTime: new Date('2024-06-05').toISOString(),
      status: 'published',
      views: 203,
    },
    {
      id: generateId(),
      title: '远程办公一年后的思考：自由与自律的平衡',
      content: `# 远程办公一年记：自由与挑战并存

疫情改变了很多人的工作方式，我也从传统的办公室工作转为了远程办公。一年过去了，有得有失，想分享一些心得体会。

## 远程办公的优势

### 1. 时间更灵活
- 不用通勤，节省了大量时间
- 可以根据个人生物钟安排工作
- 有更多时间陪伴家人

### 2. 环境更舒适
- 在熟悉的环境中工作，心情更放松
- 可以按照自己的喜好布置工作空间
- 没有办公室的嘈杂和干扰

### 3. 成本更低
- 节省通勤费用
- 在家吃饭更便宜也更健康
- 减少了工作服装的开支

## 面临的挑战

### 1. 自律性要求更高
在家工作很容易分心，需要强大的自控力。我制定了严格的作息时间表，并尽量坚持执行。

### 2. 沟通成本增加
面对面的交流变成了线上会议，有时候效率会降低。我学会了更清晰地表达想法，提前准备会议要点。

### 3. 工作生活边界模糊
在家办公很容易加班，也容易在工作时间处理私事。我专门布置了一个工作区域，下班后坚决不在那里停留。

## 我的应对策略

### 1. 建立仪式感
- 每天早上换好工作服装
- 设定固定的工作开始和结束时间
- 工作前整理桌面，创造正式的工作氛围

### 2. 保持社交联系
- 定期与同事视频通话
- 参加线上团建活动
- 偶尔到咖啡厅工作，感受人气

### 3. 关注身心健康
- 每小时起身活动一次
- 定期运动，保持身体健康
- 培养工作外的兴趣爱好

## 效率提升的技巧

### 时间管理
使用番茄工作法，25分钟专注工作，5分钟休息。这样既保证了效率，也避免了长时间工作的疲劳。

### 工具使用
- **沟通工具**：Slack、腾讯会议
- **项目管理**：Notion、Trello
- **时间追踪**：RescueTime

### 环境优化
- 充足的自然光线
- 舒适的桌椅
- 绿植装饰，改善空气质量

## 一年来的收获

1. **更好的工作生活平衡**：有更多时间陪伴家人，也有更多时间发展个人兴趣
2. **提升的自我管理能力**：学会了更好地规划时间和管理情绪
3. **增强的数字化技能**：熟练使用各种在线协作工具

## 对未来的思考

远程办公不是适合所有人的工作方式，但对我来说，它带来的收益大于挑战。我认为未来的工作模式会更加灵活，混合办公可能成为主流。

重要的是找到适合自己的工作方式，在自由与自律之间找到平衡。

## 建议

如果你也在考虑远程办公，我的建议是：
1. 诚实评估自己的自律能力
2. 与家人做好沟通和协调
3. 投资一个舒适的工作环境
4. 保持与同事和朋友的联系
5. 设定明确的工作边界

远程办公是一种生活方式的选择，没有标准答案，只有适合与不适合。`,
      summary: '分享远程办公一年来的真实体验，包括优势、挑战和应对策略。探讨如何在自由与自律之间找到平衡，提升工作效率和生活质量。',
      category: '生活',
      tags: ['远程办公', '工作', '生活方式', '时间管理', '自律'],
      authorId: demoUser.id,
      authorName: demoUser.username,
      createTime: new Date('2024-06-12').toISOString(),
      updateTime: new Date('2024-06-12').toISOString(),
      status: 'published',
      views: 178,
    },
    {
      id: generateId(),
      title: 'TypeScript 5.0 新特性深度解析',
      content: `# TypeScript 5.0：类型系统的新突破

TypeScript 5.0 带来了许多令人兴奋的新特性，让我们的开发体验更加流畅。让我们深入了解这些新功能。

## 装饰器的正式支持

TypeScript 5.0 正式支持了 ES2022 的装饰器语法：

\`\`\`typescript
function logged(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(\`Calling \${propertyKey} with\`, args);
    return originalMethod.apply(this, args);
  };
}

class Calculator {
  @logged
  add(a: number, b: number) {
    return a + b;
  }
}
\`\`\`

## const 类型参数

新的 \`const\` 类型参数让类型推断更加精确：

\`\`\`typescript
function createConfig<const T>(config: T): T {
  return config;
}

const config = createConfig({
  apiUrl: "https://api.example.com",
  timeout: 5000
} as const);
// config 的类型被推断为具体的字面量类型
\`\`\`

## 多个配置文件继承

现在可以从多个 tsconfig.json 文件继承配置：

\`\`\`json
{
  "extends": ["./base.json", "./strict.json"],
  "compilerOptions": {
    "outDir": "./dist"
  }
}
\`\`\`

## 性能优化

TypeScript 5.0 在性能方面有显著提升：
- 编译速度提升 10-20%
- 内存使用减少
- 更好的增量编译

## 总结

这些新特性让 TypeScript 更加强大和易用，值得升级体验！`,
      summary: 'TypeScript 5.0 新特性详细介绍，包括装饰器支持、const 类型参数、多配置文件继承等重要更新，以及性能方面的显著提升。',
      category: '技术',
      tags: ['TypeScript', '编程', '前端', '新特性'],
      authorId: techUser.id,
      authorName: techUser.username,
      createTime: new Date('2024-06-18').toISOString(),
      updateTime: new Date('2024-06-18').toISOString(),
      status: 'published',
      views: 145,
    }
  ];

  // 保存示例博客
  sampleBlogs.forEach(blog => {
    BlogStorage.addBlog(blog);
  });

  // 更新分类计数
  CategoryStorage.updateCategoryCounts();

  console.log('示例数据初始化完成');
}
