import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  BookOpen,
  Lightbulb,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const quickQuestions = [
  { icon: BookOpen, text: '推荐一本类似《百年孤独》的书' },
  { icon: Lightbulb, text: '解释一下什么是魔幻现实主义' },
  { icon: MessageSquare, text: '帮我总结《人类简史》的核心观点' },
  { icon: FileText, text: '如何做有效的读书笔记' },
];

const aiResponses: Record<string, string> = {
  default: `我是你的AI阅读助手，可以帮你：

📚 **推荐书籍** - 根据你的阅读偏好推荐好书
💡 **内容解读** - 帮你解析书中的难点和深层含义
📝 **笔记总结** - 协助整理阅读心得和摘要
🎯 **阅读理解** - 回答你对书籍内容的疑问

试试点击下方的快捷问题，或直接输入你的问题！`,
  recommend: `根据你喜欢《百年孤独》的风格，我为你推荐以下书籍：

**1. 《霍乱时期的爱情》** - 同样出自马尔克斯，延续了魔幻现实主义的独特魅力，讲述一段跨越半个世纪的爱情史诗。

**2. 《佩德罗·巴拉莫》** - 胡安·鲁尔福的经典之作，被认为是魔幻现实主义的源头之一。

**3. 《午夜之子》** - 萨尔曼·鲁西迪的布克奖获奖作品，以魔幻的笔触书写印度历史。

**4. 《百年孤独》其实是拉美文学爆炸的代表作**，同系列还有科塔萨尔的《跳房子》、略萨的《绿房子》等作品值得一读。

需要我详细介绍其中的某一本书吗？`,
  realism: `**魔幻现实主义**是20世纪拉丁美洲兴起的文学流派，主要特点是：

🌟 **魔法与现实的融合** - 在日常的、真实的叙事中自然地融入超自然元素，让读者感觉魔法就是现实的一部分。

🔄 **循环的时间观** - 时间不是线性前进的，而是循环往复的，过去、现在、未来交织在一起。

🌍 **本土神话与历史** - 大量运用拉丁美洲本土的神话、传说和历史，构建独特的文学世界。

🎭 **孤独与命运** - 常常探讨孤独、宿命等主题，反映拉美社会的集体心理。

除了马尔克斯，代表作家还有胡安·鲁尔福、阿莱霍·卡彭铁尔等。

这个解释清楚吗？需要我举更多例子吗？`,
  summary: `《人类简史》的核心观点可以概括为**三次革命**：

🔥 **认知革命（约7万年前）** - 智人发展出虚构故事的能力，这是人类大规模合作的基础。

🐄 **农业革命（约1万年前）** - 从采集狩猎转向农业定居，但这实际上是一种"奢侈品陷阱"，人类反而更辛苦了。

🔬 **科学革命（约500年前）** - 承认自己的无知，开始以观察和数学为基础获取新知识，推动了现代社会的发展。

**核心洞察**：
- 人类社会建立在"想象的秩序"之上
- 金钱是最成功的互信系统
- 帝国是高效的文化统一器
- 宗教提供了超越个体的价值体系

赫拉利认为，人类从一种普通的非洲猿类，变成了地球的主宰，靠的就是能够虚构并相信共同的故事。

想深入讨论哪个部分？`,
  notes: `做有效的读书笔记，可以试试这些方法：

---

**📖 阅读时的笔记方法：**

1. **划线标注法** - 用不同颜色标记重要观点、精彩段落、有疑问的地方

2. **边注法** - 在书页空白处写下即时想法、联想和问题

3. **卡片笔记法** - 每一个观点写在一张卡片上，方便后续整理和关联

---

**🎯 三种核心笔记类型：**

1. **文献笔记** - 忠实地记录原文内容，标注出处
2. **永久笔记** - 用自己的话重述观点，加上自己的理解
3. **项目笔记** - 围绕特定主题或项目整理的相关笔记

---

**💡 读书笔记黄金法则：**

- 记录 **为什么** 这个观点重要，而不只是记录观点本身
- 写下你 **不同意** 的地方和你的理由
- 标记 **后续需要跟进** 的阅读材料
- 定期 **回顾和整理** 你的笔记系统

---

你平时用什么方式做笔记？我可以帮你优化你的笔记方法！`,
};

export function AIAssistant() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: aiResponses.default,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim() || isTyping) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      let response = aiResponses.default;

      if (text.includes('推荐')) {
        response = aiResponses.recommend;
      } else if (text.includes('魔幻现实主义')) {
        response = aiResponses.realism;
      } else if (text.includes('人类简史') || text.includes('总结')) {
        response = aiResponses.summary;
      } else if (text.includes('笔记') || text.includes('读书笔记')) {
        response = aiResponses.notes;
      } else {
        response = `这是一个很好的问题！

关于"${text}"，我需要更多时间来整理一个全面的回答。在实际应用中，我会连接真正的AI接口来提供准确的回答。

目前这是一个演示版本，展示了AI助手在个人书库中的应用场景。你可以试试点击下方的快捷问题来体验更多功能！`;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white">
          <Sparkles size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-primary dark:text-white">
            AI 阅读助手
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            你的智能阅读伙伴
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl border border-border dark:border-border-dark flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-accent text-white rounded-br-md'
                    : 'bg-muted dark:bg-muted-dark text-primary dark:text-white rounded-bl-md'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 text-accent">
                    <Sparkles size={16} />
                    <span className="text-xs font-medium">AI 助手</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted dark:bg-muted-dark px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        <div className="px-4 py-3 border-t border-border dark:border-border-dark">
          <div className="flex flex-wrap gap-2 mb-3">
            {quickQuestions.map((q, index) => {
              const Icon = q.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleSend(q.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-muted dark:bg-muted-dark hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl text-xs text-gray-600 dark:text-gray-300 transition-colors"
                >
                  <Icon size={14} />
                  {q.text}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border dark:border-border-dark">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="输入你的问题..."
              className="flex-1 px-4 py-3 rounded-xl bg-muted dark:bg-muted-dark border-0 text-primary dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isTyping}
              className="p-3 bg-accent text-white rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
