export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  description: string;
  category: string;
  tags: string[];
  totalPages: number;
  currentPage: number;
  format: 'epub' | 'pdf' | 'mobi' | 'txt';
  uploadedAt: string;
  lastReadAt?: string;
  totalReadingTime: number; // in minutes
}

export interface Bookmark {
  id: string;
  bookId: string;
  page: number;
  createdAt: string;
  note?: string;
}

export interface Highlight {
  id: string;
  bookId: string;
  text: string;
  page: number;
  color: string;
  note?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  bookCount: number;
}

export const categories: Category[] = [
  { id: '1', name: '文学小说', color: '#8B5CF6', bookCount: 12 },
  { id: '2', name: '科技', color: '#0EA5E9', bookCount: 8 },
  { id: '3', name: '历史', color: '#F59E0B', bookCount: 6 },
  { id: '4', name: '哲学', color: '#EF4444', bookCount: 5 },
  { id: '5', name: '心理学', color: '#10B981', bookCount: 7 },
  { id: '6', name: '传记', color: '#EC4899', bookCount: 4 },
];

export const tags = [
  '经典', '现代', '科幻', '悬疑', '言情', '武侠',
  '诗歌', '散文', '传记', '历史', '哲学', '心理学',
  '编程', 'AI', '设计', '商业', '经济', '社会'
];

export const books: Book[] = [
  {
    id: '1',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98bebd3?auto=format&fit=crop&q=80&w=300&h=400',
    description: '《百年孤独》是魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事，以及加勒比海沿岸小镇马孔多的百年兴衰。',
    category: '文学小说',
    tags: ['经典', '魔幻现实主义'],
    totalPages: 360,
    currentPage: 145,
    format: 'epub',
    uploadedAt: '2024-01-15',
    lastReadAt: '2024-05-20',
    totalReadingTime: 240,
  },
  {
    id: '2',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    cover: 'https://images.unsplash.com/photo-1543002580-c756a8468a36?auto=format&fit=crop&q=80&w=300&h=400',
    description: '从认知革命到科学革命，探索人类如何成为地球主宰的历程。',
    category: '历史',
    tags: ['历史', '人类学', '经典'],
    totalPages: 440,
    currentPage: 320,
    format: 'pdf',
    uploadedAt: '2024-02-20',
    lastReadAt: '2024-05-18',
    totalReadingTime: 560,
  },
  {
    id: '3',
    title: '深度学习',
    author: 'Ian Goodfellow',
    cover: 'https://images.unsplash.com/photo-1515879218376-6b0bcbceab6b?auto=format&fit=crop&q=80&w=300&h=400',
    description: '深度学习领域的经典教材，涵盖神经网络基础到最新进展。',
    category: '科技',
    tags: ['AI', '编程', '经典'],
    totalPages: 780,
    currentPage: 120,
    format: 'pdf',
    uploadedAt: '2024-03-10',
    lastReadAt: '2024-05-15',
    totalReadingTime: 180,
  },
  {
    id: '4',
    title: '存在与虚无',
    author: '让-保罗·萨特',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300&h=400',
    description: '存在主义哲学的奠基之作，探讨自由、责任与存在的本质。',
    category: '哲学',
    tags: ['哲学', '存在主义', '经典'],
    totalPages: 620,
    currentPage: 0,
    format: 'epub',
    uploadedAt: '2024-01-25',
    totalReadingTime: 0,
  },
  {
    id: '5',
    title: '思考，快与慢',
    author: '丹尼尔·卡尼曼',
    cover: 'https://images.unsplash.com/photo-1456513080592-5242a2a3a3a?auto=format&fit=crop&q=80&w=300&h=400',
    description: '诺贝尔经济学奖得主关于人类思维系统的经典研究。',
    category: '心理学',
    tags: ['心理学', '行为经济学', '经典'],
    totalPages: 512,
    currentPage: 256,
    format: 'epub',
    uploadedAt: '2024-02-14',
    lastReadAt: '2024-05-19',
    totalReadingTime: 320,
  },
  {
    id: '6',
    title: '史蒂夫·乔布斯传',
    author: '沃尔特·艾萨克森',
    cover: 'https://images.unsplash.com/photo-1518531926272-a07a646116f5?auto=format&fit=crop&q=80&w=300&h=400',
    description: '苹果公司创始人的独家传记，展现一位传奇企业家的人生。',
    category: '传记',
    tags: ['传记', '商业', '科技'],
    totalPages: 656,
    currentPage: 0,
    format: 'epub',
    uploadedAt: '2024-03-05',
    totalReadingTime: 0,
  },
  {
    id: '7',
    title: '三体',
    author: '刘慈欣',
    cover: 'https://images.unsplash.com/photo-1446773436665-8156e4242e42?auto=format&fit=crop&q=80&w=300&h=400',
    description: '中国科幻文学的里程碑之作，展现宇宙级别的文明冲突。',
    category: '文学小说',
    tags: ['科幻', '经典', '现代'],
    totalPages: 302,
    currentPage: 302,
    format: 'epub',
    uploadedAt: '2024-01-08',
    lastReadAt: '2024-04-22',
    totalReadingTime: 480,
  },
  {
    id: '8',
    title: '设计心理学',
    author: '唐纳德·诺曼',
    cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300&h=400',
    description: '交互设计领域的经典著作，探讨设计与人类心理的关系。',
    category: '科技',
    tags: ['设计', '心理学', '经典'],
    totalPages: 328,
    currentPage: 89,
    format: 'pdf',
    uploadedAt: '2024-03-28',
    lastReadAt: '2024-05-21',
    totalReadingTime: 120,
  },
];

export const bookmarks: Bookmark[] = [
  { id: '1', bookId: '1', page: 42, createdAt: '2024-05-10', note: '布恩迪亚家族的起源' },
  { id: '2', bookId: '1', page: 108, createdAt: '2024-05-15', note: '重要的情节转折' },
  { id: '3', bookId: '2', page: 200, createdAt: '2024-05-12' },
  { id: '4', bookId: '5', page: 150, createdAt: '2024-05-18', note: '系统1与系统2的区别' },
];

export const highlights: Highlight[] = [
  { id: '1', bookId: '1', text: '多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。', page: 1, color: '#FEF08A', createdAt: '2024-05-10' },
  { id: '2', bookId: '1', text: '世界新生伊始，许多事物还没有名字，提到的时候尚需用手指指点点。', page: 15, color: '#BBF7D0', createdAt: '2024-05-11' },
  { id: '3', bookId: '2', text: '金钱是有史以来最普遍也最有效的互信系统。', page: 120, color: '#FECACA', createdAt: '2024-05-12', note: '关于货币的本质' },
  { id: '4', bookId: '5', text: '我们的大脑容易受到认知偏差的影响，这些偏差常常导致我们做出错误的决策。', page: 80, color: '#DDD6FE', createdAt: '2024-05-18' },
  { id: '5', bookId: '5', text: '直觉思维是快速的、自动的、不费力的，而理性思维是缓慢的、受控的、费力的。', page: 45, color: '#FEF08A', createdAt: '2024-05-19', note: '核心观点' },
];

// Sample book content for reader
export const bookContent = {
  chapters: [
    {
      title: '第一章',
      content: `
多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。

那时的马孔多是一个有二十户人家的村落，用泥巴和芦苇盖的房屋就排列在河岸，清澈的河水奔流不息，河床上光滑洁白，河里的石头又大又光滑，仿佛史前的巨蛋。

这世界还相当新，许多事物还没有名字，提到的时候尚需用手指指点点。每年三月，衣衫褴褛的吉卜赛人都要在村边搭起帐篷，在笛鼓的喧嚣声中，向居民介绍最新的发明。

最初他们带来了磁铁。一个身材魁梧的吉卜赛人，自称墨尔基阿德斯，满脸乱蓬蓬的胡子，一双麻雀似的小手，当众表演了一番惊人的魔术。他声称这是马其顿的炼金术士创造的第八奇迹。他拿着两块铁锭，在屋子里走来走去，使得所有的钉子、螺丝、铁钉、铁环，甚至连那些遗失了多年的铁制品，都从原处飞了出来，在空气中飞舞，排着队跟在他的两块铁锭后面。"

"东西也有生命，"吉卜赛人厉声说道，"一切全在于唤起它们的灵性。"霍塞·阿卡迪奥·布恩迪亚那狂热的想象力，总是超越大自然的创造，甚至超越奇迹和魔术。他想，要是用这无用的发明，来开采地下的黄金。

墨尔基阿德斯是个正派的人，他及时提醒他说："这东西可办不到。"可是霍塞·阿卡迪奥·布恩迪亚那时还不相信吉卜赛人的话，他用一头骡子和一群山羊换了两块磁铁。乌尔苏拉·伊瓜兰，他的妻子，本来想用这些牲畜来扩大家业，但她没能劝阻他。"

"很快就会有足够的黄金来铺家里的地板，"她的丈夫回答说。
      `,
    },
    {
      title: '第二章',
      content: `
此后的几个月里，霍塞·阿卡迪奥·布恩迪亚作了顽强的努力，想证明磁铁的魔力。他翻遍了整个地区，甚至爬到了河边的乱石堆里，他还跳进河里，一直走到河水齐腰的地方，用磁铁探测河床，什么也没找到，只找到一副十五世纪的盔甲，盔甲的各个部分都锈得粘在一起，里面还响着空洞的回声，像是装满了石头。

他又花了更多的时间和精力，终于明白了一个道理：磁铁并不能吸黄金。

第二年三月，吉卜赛人又来了。这次他们带来了一架望远镜和一只放大镜，说是阿姆斯特丹的犹太科学家最新的发明。

他们把望远镜架在帐篷门口，收五个里亚尔看一次。人们透过望远镜，可以看到近在眼前的太阳，上面的黑子历历在目。

这次，霍塞·阿卡迪奥·布恩迪亚对吉卜赛人的发明没有表现出多大的兴趣。相反，他把自己关在屋子里，整整两天两夜没有合眼，仔细研究那些星辰的运行，希望能找到一种可靠的方法来预测地震。

他的研究没有取得什么成果，却意外地发现了地球是圆的，就像一个橙子。

当他把这个发现告诉乌尔苏拉的时候，她正在厨房里搅着一锅咖啡，听了他的话，几乎把锅打翻在地上。

"这太荒谬了，"她说，"如果地球像橙子一样是圆的，那我们住在下面的人不就掉下去了吗？"

霍塞·阿卡迪奥·布恩迪亚没有回答她的问题，因为他突然有了一个新的想法。他想用放大镜来做武器。

他花了好几天的时间，在太阳下做实验，把阳光聚焦在一点上，结果把自己的手烧伤了。如果不是乌尔苏拉及时把放大镜从他手里夺下来，他恐怕要把自己烧死了。

从那以后，霍塞·阿卡迪奥·布恩迪亚对科学发明的兴趣越来越浓厚了。他把家里的东西都拿来做实验，结果把家里弄得一团糟。
      `,
    },
    {
      title: '第三章',
      content: `
日子一天天过去，霍塞·阿卡迪奥·布恩迪亚的实验越来越多，也越来越奇怪。他开始研究炼金术，想把普通的金属变成黄金。

他把家里所有的金属制品都熔化了，然后把它们混在一起，结果得到了一块黑乎乎的东西，既不是黄金，也不是任何已知的金属。

乌尔苏拉对他的行为越来越不满，但她还是默默地支持着他，因为她相信，她的丈夫总有一天会成功的。

"你会把我们的家毁了的，"她有时候会这么说。

但霍塞·阿卡迪奥·布恩迪亚总是回答说："耐心点，我们很快就会发财的。"

然而，发财的日子并没有到来。相反，他们的家变得越来越穷，乌尔苏拉不得不更加努力地工作，来维持这个家。

有一天，霍塞·阿卡迪奥·布恩迪亚突然有了一个新的想法。他想发明一种永动机，一种不需要任何能源就能永远运转的机器。

他花了好几个月的时间来设计和制造这台机器，结果失败了。但他并没有放弃，他继续改进他的设计，继续他的实验。

就在这个时候，他们的第一个孩子出生了。这是一个男孩，他们给他取名叫霍塞·阿卡迪奥。

孩子的出生给这个家庭带来了新的希望，也带来了新的责任。乌尔苏拉把所有的精力都放在了孩子身上，而霍塞·阿卡迪奥·布恩迪亚则继续他的实验。

日子就这样一天天过去，马孔多这个小村庄也在慢慢地发展壮大。越来越多的人来到这里定居，村子里的房屋越来越多，街道也越来越宽。

但霍塞·阿卡迪奥·布恩迪亚对这些变化并不关心，他仍然沉浸在自己的世界里，继续他的实验，继续他的追求。
      `,
    },
  ],
};
