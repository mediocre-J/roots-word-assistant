(function() {
    'use strict';
    // 直连 DeepSeek API（不使用 Worker 代理）
    const API_PROXY_URL = '';
    const FALLBACK_DIRECT = true;
    const DIRECT_API_KEY = 'sk-ce3fb47c471f467ebd5be08e1c0509bf';
    const CACHE_PREFIX = 'wordanalysis_';
    const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
    const CACHE_VERSION = 3; // 递增此版本号可使所有旧缓存失效
    const SM2_PREFIX = 'sm2_';
    const HISTORY_PREFIX = 'word_history_';
    const HISTORY_MAX = 50; // 最多保留 50 条历史

    // ===== 词形变化引擎（完全本地化，不依赖 AI） =====
    var IRREGULAR_VERBS = {
        'arise': {past_tense: 'arose', past_participle: 'arisen', present_participle: 'arising'},
        'awake': {past_tense: 'awoke', past_participle: 'awoken', present_participle: 'awaking'},
        'be': {past_tense: 'was/were', past_participle: 'been', present_participle: 'being'},
        'bear': {past_tense: 'bore', past_participle: 'borne', present_participle: 'bearing'},
        'beat': {past_tense: 'beat', past_participle: 'beaten', present_participle: 'beating'},
        'become': {past_tense: 'became', past_participle: 'become', present_participle: 'becoming'},
        'begin': {past_tense: 'began', past_participle: 'begun', present_participle: 'beginning'},
        'bend': {past_tense: 'bent', past_participle: 'bent', present_participle: 'bending'},
        'bet': {past_tense: 'bet', past_participle: 'bet', present_participle: 'betting'},
        'bind': {past_tense: 'bound', past_participle: 'bound', present_participle: 'binding'},
        'bite': {past_tense: 'bit', past_participle: 'bitten', present_participle: 'biting'},
        'bleed': {past_tense: 'bled', past_participle: 'bled', present_participle: 'bleeding'},
        'blow': {past_tense: 'blew', past_participle: 'blown', present_participle: 'blowing'},
        'break': {past_tense: 'broke', past_participle: 'broken', present_participle: 'breaking'},
        'bring': {past_tense: 'brought', past_participle: 'brought', present_participle: 'bringing'},
        'build': {past_tense: 'built', past_participle: 'built', present_participle: 'building'},
        'burn': {past_tense: 'burnt/burned', past_participle: 'burnt/burned', present_participle: 'burning'},
        'burst': {past_tense: 'burst', past_participle: 'burst', present_participle: 'bursting'},
        'buy': {past_tense: 'bought', past_participle: 'bought', present_participle: 'buying'},
        'catch': {past_tense: 'caught', past_participle: 'caught', present_participle: 'catching'},
        'choose': {past_tense: 'chose', past_participle: 'chosen', present_participle: 'choosing'},
        'cling': {past_tense: 'clung', past_participle: 'clung', present_participle: 'clinging'},
        'come': {past_tense: 'came', past_participle: 'come', present_participle: 'coming'},
        'cost': {past_tense: 'cost', past_participle: 'cost', present_participle: 'costing'},
        'creep': {past_tense: 'crept', past_participle: 'crept', present_participle: 'creeping'},
        'cut': {past_tense: 'cut', past_participle: 'cut', present_participle: 'cutting'},
        'deal': {past_tense: 'dealt', past_participle: 'dealt', present_participle: 'dealing'},
        'dig': {past_tense: 'dug', past_participle: 'dug', present_participle: 'digging'},
        'do': {past_tense: 'did', past_participle: 'done', present_participle: 'doing'},
        'draw': {past_tense: 'drew', past_participle: 'drawn', present_participle: 'drawing'},
        'dream': {past_tense: 'dreamt/dreamed', past_participle: 'dreamt/dreamed', present_participle: 'dreaming'},
        'drink': {past_tense: 'drank', past_participle: 'drunk', present_participle: 'drinking'},
        'drive': {past_tense: 'drove', past_participle: 'driven', present_participle: 'driving'},
        'dwell': {past_tense: 'dwelt', past_participle: 'dwelt', present_participle: 'dwelling'},
        'eat': {past_tense: 'ate', past_participle: 'eaten', present_participle: 'eating'},
        'fall': {past_tense: 'fell', past_participle: 'fallen', present_participle: 'falling'},
        'feed': {past_tense: 'fed', past_participle: 'fed', present_participle: 'feeding'},
        'feel': {past_tense: 'felt', past_participle: 'felt', present_participle: 'feeling'},
        'fight': {past_tense: 'fought', past_participle: 'fought', present_participle: 'fighting'},
        'find': {past_tense: 'found', past_participle: 'found', present_participle: 'finding'},
        'flee': {past_tense: 'fled', past_participle: 'fled', present_participle: 'fleeing'},
        'fling': {past_tense: 'flung', past_participle: 'flung', present_participle: 'flinging'},
        'fly': {past_tense: 'flew', past_participle: 'flown', present_participle: 'flying'},
        'forbid': {past_tense: 'forbade', past_participle: 'forbidden', present_participle: 'forbidding'},
        'forget': {past_tense: 'forgot', past_participle: 'forgotten', present_participle: 'forgetting'},
        'forgive': {past_tense: 'forgave', past_participle: 'forgiven', present_participle: 'forgiving'},
        'freeze': {past_tense: 'froze', past_participle: 'frozen', present_participle: 'freezing'},
        'get': {past_tense: 'got', past_participle: 'gotten/got', present_participle: 'getting'},
        'give': {past_tense: 'gave', past_participle: 'given', present_participle: 'giving'},
        'go': {past_tense: 'went', past_participle: 'gone', present_participle: 'going'},
        'grind': {past_tense: 'ground', past_participle: 'ground', present_participle: 'grinding'},
        'grow': {past_tense: 'grew', past_participle: 'grown', present_participle: 'growing'},
        'hang': {past_tense: 'hung', past_participle: 'hung', present_participle: 'hanging'},
        'have': {past_tense: 'had', past_participle: 'had', present_participle: 'having'},
        'hear': {past_tense: 'heard', past_participle: 'heard', present_participle: 'hearing'},
        'hide': {past_tense: 'hid', past_participle: 'hidden', present_participle: 'hiding'},
        'hit': {past_tense: 'hit', past_participle: 'hit', present_participle: 'hitting'},
        'hold': {past_tense: 'held', past_participle: 'held', present_participle: 'holding'},
        'hurt': {past_tense: 'hurt', past_participle: 'hurt', present_participle: 'hurting'},
        'keep': {past_tense: 'kept', past_participle: 'kept', present_participle: 'keeping'},
        'kneel': {past_tense: 'knelt', past_participle: 'knelt', present_participle: 'kneeling'},
        'know': {past_tense: 'knew', past_participle: 'known', present_participle: 'knowing'},
        'lay': {past_tense: 'laid', past_participle: 'laid', present_participle: 'laying'},
        'lead': {past_tense: 'led', past_participle: 'led', present_participle: 'leading'},
        'lean': {past_tense: 'leant/leaned', past_participle: 'leant/leaned', present_participle: 'leaning'},
        'leap': {past_tense: 'leapt/leaped', past_participle: 'leapt/leaped', present_participle: 'leaping'},
        'learn': {past_tense: 'learnt/learned', past_participle: 'learnt/learned', present_participle: 'learning'},
        'leave': {past_tense: 'left', past_participle: 'left', present_participle: 'leaving'},
        'lend': {past_tense: 'lent', past_participle: 'lent', present_participle: 'lending'},
        'let': {past_tense: 'let', past_participle: 'let', present_participle: 'letting'},
        'lie': {past_tense: 'lay', past_participle: 'lain', present_participle: 'lying'},
        'light': {past_tense: 'lit/lighted', past_participle: 'lit/lighted', present_participle: 'lighting'},
        'lose': {past_tense: 'lost', past_participle: 'lost', present_participle: 'losing'},
        'make': {past_tense: 'made', past_participle: 'made', present_participle: 'making'},
        'mean': {past_tense: 'meant', past_participle: 'meant', present_participle: 'meaning'},
        'meet': {past_tense: 'met', past_participle: 'met', present_participle: 'meeting'},
        'pay': {past_tense: 'paid', past_participle: 'paid', present_participle: 'paying'},
        'put': {past_tense: 'put', past_participle: 'put', present_participle: 'putting'},
        'quit': {past_tense: 'quit', past_participle: 'quit', present_participle: 'quitting'},
        'read': {past_tense: 'read', past_participle: 'read', present_participle: 'reading'},
        'rid': {past_tense: 'rid', past_participle: 'rid', present_participle: 'ridding'},
        'ride': {past_tense: 'rode', past_participle: 'ridden', present_participle: 'riding'},
        'ring': {past_tense: 'rang', past_participle: 'rung', present_participle: 'ringing'},
        'rise': {past_tense: 'rose', past_participle: 'risen', present_participle: 'rising'},
        'run': {past_tense: 'ran', past_participle: 'run', present_participle: 'running'},
        'say': {past_tense: 'said', past_participle: 'said', present_participle: 'saying'},
        'see': {past_tense: 'saw', past_participle: 'seen', present_participle: 'seeing'},
        'seek': {past_tense: 'sought', past_participle: 'sought', present_participle: 'seeking'},
        'sell': {past_tense: 'sold', past_participle: 'sold', present_participle: 'selling'},
        'send': {past_tense: 'sent', past_participle: 'sent', present_participle: 'sending'},
        'set': {past_tense: 'set', past_participle: 'set', present_participle: 'setting'},
        'shake': {past_tense: 'shook', past_participle: 'shaken', present_participle: 'shaking'},
        'shine': {past_tense: 'shone', past_participle: 'shone', present_participle: 'shining'},
        'shoot': {past_tense: 'shot', past_participle: 'shot', present_participle: 'shooting'},
        'show': {past_tense: 'showed', past_participle: 'shown', present_participle: 'showing'},
        'shrink': {past_tense: 'shrank', past_participle: 'shrunk', present_participle: 'shrinking'},
        'shut': {past_tense: 'shut', past_participle: 'shut', present_participle: 'shutting'},
        'sing': {past_tense: 'sang', past_participle: 'sung', present_participle: 'singing'},
        'sink': {past_tense: 'sank', past_participle: 'sunk', present_participle: 'sinking'},
        'sit': {past_tense: 'sat', past_participle: 'sat', present_participle: 'sitting'},
        'sleep': {past_tense: 'slept', past_participle: 'slept', present_participle: 'sleeping'},
        'slide': {past_tense: 'slid', past_participle: 'slid', present_participle: 'sliding'},
        'speak': {past_tense: 'spoke', past_participle: 'spoken', present_participle: 'speaking'},
        'spend': {past_tense: 'spent', past_participle: 'spent', present_participle: 'spending'},
        'spin': {past_tense: 'spun', past_participle: 'spun', present_participle: 'spinning'},
        'spread': {past_tense: 'spread', past_participle: 'spread', present_participle: 'spreading'},
        'stand': {past_tense: 'stood', past_participle: 'stood', present_participle: 'standing'},
        'steal': {past_tense: 'stole', past_participle: 'stolen', present_participle: 'stealing'},
        'stick': {past_tense: 'stuck', past_participle: 'stuck', present_participle: 'sticking'},
        'sting': {past_tense: 'stung', past_participle: 'stung', present_participle: 'stinging'},
        'strike': {past_tense: 'struck', past_participle: 'struck', present_participle: 'striking'},
        'swear': {past_tense: 'swore', past_participle: 'sworn', present_participle: 'swearing'},
        'sweep': {past_tense: 'swept', past_participle: 'swept', present_participle: 'sweeping'},
        'swim': {past_tense: 'swam', past_participle: 'swum', present_participle: 'swimming'},
        'swing': {past_tense: 'swung', past_participle: 'swung', present_participle: 'swinging'},
        'take': {past_tense: 'took', past_participle: 'taken', present_participle: 'taking'},
        'teach': {past_tense: 'taught', past_participle: 'taught', present_participle: 'teaching'},
        'tear': {past_tense: 'tore', past_participle: 'torn', present_participle: 'tearing'},
        'tell': {past_tense: 'told', past_participle: 'told', present_participle: 'telling'},
        'think': {past_tense: 'thought', past_participle: 'thought', present_participle: 'thinking'},
        'throw': {past_tense: 'threw', past_participle: 'thrown', present_participle: 'throwing'},
        'understand': {past_tense: 'understood', past_participle: 'understood', present_participle: 'understanding'},
        'wake': {past_tense: 'woke', past_participle: 'woken', present_participle: 'waking'},
        'wear': {past_tense: 'wore', past_participle: 'worn', present_participle: 'wearing'},
        'weep': {past_tense: 'wept', past_participle: 'wept', present_participle: 'weeping'},
        'win': {past_tense: 'won', past_participle: 'won', present_participle: 'winning'},
        'wind': {past_tense: 'wound', past_participle: 'wound', present_participle: 'winding'},
        'withdraw': {past_tense: 'withdrew', past_participle: 'withdrawn', present_participle: 'withdrawing'},
        'write': {past_tense: 'wrote', past_participle: 'written', present_participle: 'writing'},
    };

    // 根据原型生成所有变形形式
    // 本地引擎职责：仅处理不规则动词（精确），规则动词/名词/形容词全部交给 AI
    function getInflections(baseWord) {
        var lower = baseWord.toLowerCase();
        // 仅对不规则动词表精确生效
        if (IRREGULAR_VERBS[lower]) {
            return IRREGULAR_VERBS[lower];
        }
        // 规则动词/名词/形容词：返回空，让 AI 处理
        return {
            past_tense: '',
            past_participle: '',
            present_participle: '',
            plural: '',
            comparative: '',
            superlative: ''
        };
    }

    // 第三人称单数动词表（以 s/es 结尾的常见动词）
    var THIRD_PERSON_SINGULAR = {
        'does': 'do', 'goes': 'go', 'has': 'have', 'says': 'say',
        'makes': 'make', 'takes': 'take', 'comes': 'come', 'gives': 'give',
        'uses': 'use', 'gets': 'get', 'puts': 'put', 'sets': 'set',
        'runs': 'run', 'sits': 'sit', 'eats': 'eat', 'sees': 'see',
        'knows': 'know', 'thinks': 'think', 'finds': 'find', 'tells': 'tell',
        'becomes': 'become', 'begins': 'begin', 'brings': 'bring', 'buys': 'buy',
        'calls': 'call', 'carries': 'carry', 'catches': 'catch', 'chooses': 'choose',
        'drinks': 'drink', 'drives': 'drive', 'falls': 'fall', 'feels': 'feel',
        'grows': 'grow', 'hides': 'hide', 'holds': 'hold', 'keeps': 'keep',
        'leads': 'lead', 'leaves': 'leave', 'lends': 'lend', 'loses': 'lose',
        'means': 'mean', 'meets': 'meet', 'pays': 'pay', 'reads': 'read',
        'rides': 'ride', 'rises': 'rise', 'sells': 'sell', 'sends': 'send',
        'shows': 'show', 'sings': 'sing', 'sleeps': 'sleep', 'speaks': 'speak',
        'spends': 'spend', 'stands': 'stand', 'steals': 'steal', 'swims': 'swim',
        'teaches': 'teach', 'throws': 'throw', 'wakes': 'wake', 'wears': 'wear',
        'wins': 'win', 'writes': 'write'
    };

    // 反向查找：判断单词是否是变形形式，返回 {isInflected, baseForm, inflectionType}
    // 使用双向验证法：生成所有候选原型，用 getInflections 反向验证哪个正确
    // 本地引擎职责：仅识别不规则动词变形，规则动词/名词/形容词交给 AI
    function findBaseForm(word) {
        var lower = word.toLowerCase();

        // 1. 检查是否是不规则动词的变形
        for (var base in IRREGULAR_VERBS) {
            var forms = IRREGULAR_VERBS[base];
            if (lower === forms.past_tense || lower === forms.past_participle) {
                return {isInflected: true, baseForm: base, inflectionType: '过去式/过去分词'};
            }
            if (lower === forms.present_participle) {
                return {isInflected: true, baseForm: base, inflectionType: '现在分词'};
            }
        }

        // 1.5 特殊处理：第三人称单数（does, goes, becomes 等）
        if (THIRD_PERSON_SINGULAR[lower]) {
            return {isInflected: true, baseForm: THIRD_PERSON_SINGULAR[lower], inflectionType: '第三人称单数'};
        }

        // 2. 生成所有可能的候选原型
        var candidates = [];

        // 候选：去掉 -ing
        if (lower.endsWith('ing') && lower.length > 5) {
            var base = lower.slice(0, -3);
            // 双写辅音的情况（running → run）
            if (base.length > 1 && base[base.length-1] === base[base.length-2]) {
                candidates.push({base: base.slice(0, -1), type: '现在分词'});
            }
            candidates.push({base: base, type: '现在分词'});
            // 去掉 e 加 ing 的情况（exploring → explore）
            if (!'aeiou'.includes(base[base.length-1])) {
                candidates.push({base: base + 'e', type: '现在分词'});
            }
        }

        // 候选：去掉 -ed
        if (lower.endsWith('ed') && lower.length > 4) {
            var base = lower.slice(0, -2);
            if (base.length > 1 && base[base.length-1] === base[base.length-2]) {
                candidates.push({base: base.slice(0, -1), type: '过去式/过去分词'});
            }
            candidates.push({base: base, type: '过去式/过去分词'});
            // 去掉 e 加 d 的情况（liked → like）
            if (!'aeiou'.includes(base[base.length-1])) {
                candidates.push({base: base + 'e', type: '过去式/过去分词'});
            }
        }

        // 候选：去掉 -s/-es/-ies（仅用于辅助识别，本地不再生成复数形式）
        if (lower.endsWith('ies') && lower.length > 4) {
            candidates.push({base: lower.slice(0, -3) + 'y', type: '复数'});
        } else if (lower.endsWith('es') && lower.length > 4) {
            candidates.push({base: lower.slice(0, -2), type: '复数'});
            candidates.push({base: lower.slice(0, -1), type: '复数'});
        } else if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 4) {
            candidates.push({base: lower.slice(0, -1), type: '复数'});
        }

        // 3. 用 getInflections 反向验证：只验证动词变形（不规则动词表）
        for (var i = 0; i < candidates.length; i++) {
            var c = candidates[i];
            var inf = getInflections(c.base);
            // 只匹配动词变形（past_tense, past_participle, present_participle）
            // 不匹配 plural/comparative/superlative（这些交给 AI）
            if (lower === inf.past_tense || lower === inf.past_participle ||
                lower === inf.present_participle) {
                return {isInflected: true, baseForm: c.base, inflectionType: c.type};
            }
        }

        // 4. 兜底：只有候选看起来像真实单词时才返回
        if (candidates.length > 0) {
            // 过滤：只保留长度 >= 3 且只含字母的候选
            var validCandidates = candidates.filter(function(c) {
                return c.base.length >= 3 && /^[a-z]+$/.test(c.base);
            });
            if (validCandidates.length > 0) {
                // 选最长的（避免 cultures→cultur 这种错误）
                var best = validCandidates[0];
                for (var j = 1; j < validCandidates.length; j++) {
                    if (validCandidates[j].base.length > best.base.length) {
                        best = validCandidates[j];
                    }
                }
                return {isInflected: true, baseForm: best.base, inflectionType: best.type};
            }
        }

        return {isInflected: false, baseForm: lower, inflectionType: ''};
    }

    // DOM
    const $ = id => document.getElementById(id);
    const imageInput = $('imageInput'), uploadArea = $('uploadArea'), uploadPreview = $('uploadPreview'), uploadPlaceholder = $('uploadPlaceholder');
    const recognizeBtn = $('recognizeBtn');
    const progressContainer = $('progressContainer'), progressFill = $('progressFill'), progressStatus = $('progressStatus');
    const wordCloud = $('wordCloud'), analysisResult = $('analysisResult');
    const switchInputBtn = $('switchInputBtn'), textInputArea = $('textInputArea'), englishText = $('englishText'), analyzeTextBtn = $('analyzeTextBtn');
    const wordEditArea = $('wordEditArea'), wordCountSpan = $('wordCountSpan'), clearAllWordsBtn = $('clearAllWordsBtn');
    const reviewBtn = $('reviewBtn'), dueCountSpan = $('dueCountSpan'), reviewPanel = $('reviewPanel'), reviewList = $('reviewList'), closeReviewBtn = $('closeReviewBtn');
    const cropModal = $('cropModal'), cropImage = $('cropImage');
    const cropCloseBtn = $('cropCloseBtn'), rotateLeftBtn = $('rotateLeftBtn'), rotateRightBtn = $('rotateRightBtn');
    const cropConfirmBtn = $('cropConfirmBtn'), cropCancelBtn = $('cropCancelBtn');
    const exportCsvBtn = $('exportCsvBtn'), copyAllBtn = $('copyAllBtn');
    const toastContainer = $('toastContainer');

    let wordGroups = [];
    let currentImageFile = null;
    let isTextMode = false;
    let cropper = null;

    // ===== Toast =====
    function toast(msg, type) {
        const t = document.createElement('div');
        t.className = 'toast' + (type ? ' ' + type : '');
        t.textContent = msg;
        toastContainer.appendChild(t);
        setTimeout(() => t.remove(), 2500);
    }

    // ===== Cache =====
    function getCached(word) {
        try {
            const raw = localStorage.getItem(CACHE_PREFIX + word.toLowerCase());
            if (raw) {
                const data = JSON.parse(raw);
                // 检查缓存版本号，版本不匹配则视为无效缓存
                if (data.v !== CACHE_VERSION) return null;
                if (Date.now() - data.t < CACHE_EXPIRY_MS) return data.r;
            }
        } catch(e) {}
        return null;
    }
    function setCache(word, result) {
        try { localStorage.setItem(CACHE_PREFIX + word.toLowerCase(), JSON.stringify({r: result, t: Date.now(), v: CACHE_VERSION})); } catch(e) {}
    }

    // ===== 方案 C — 艾宾浩斯 + SM-2 混合复习系统 =====
    const EBB_INTERVALS_MS = [20 * 60 * 1000, 60 * 60 * 1000, 9 * 60 * 60 * 1000];
    const EBB_LABELS = ['20 分钟后', '1 小时后', '9 小时后'];
    const REVIEW_LOG_PREFIX = 'review_log_';
    const REVIEW_PANEL_STATE_KEY = 'review_panel_state';

    let reviewPanelState = {
        isOpen: false,
        activeTab: 'due'
    };

    function loadReviewPanelState() {
        try {
            const saved = localStorage.getItem(REVIEW_PANEL_STATE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                reviewPanelState.isOpen = parsed.isOpen || false;
                reviewPanelState.activeTab = parsed.activeTab || 'due';
            }
        } catch(e) {}
    }

    function saveReviewPanelState() {
        try {
            localStorage.setItem(REVIEW_PANEL_STATE_KEY, JSON.stringify(reviewPanelState));
        } catch(e) {}
    }

    function getMasteredCount() {
        const data = getSM2Data();
        return Object.values(data).filter(c => c.phase === 'sm2' && c.reps >= 3).length;
    }

    function getTotalDays() {
        const data = getSM2Data();
        const words = Object.keys(data);
        if (!words.length) return 0;
        let firstDate = localStorage.getItem('sm2_first_date');
        if (!firstDate) {
            firstDate = Date.now();
            localStorage.setItem('sm2_first_date', firstDate);
        }
        const MIN_VALID_TIMESTAMP = 946656000000;
        let ts = parseInt(firstDate);
        if (isNaN(ts) || ts < MIN_VALID_TIMESTAMP) {
            ts = Date.now();
            localStorage.setItem('sm2_first_date', ts);
        }
        const first = new Date(ts);
        const now = new Date();
        const diff = Math.floor((now - first) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff + 1);
    }

    function getTodayCompleted() {
        const today = new Date().toDateString();
        try {
            const log = JSON.parse(localStorage.getItem(REVIEW_LOG_PREFIX + today) || '[]');
            return log.length;
        } catch(e) { return 0; }
    }

    function logReview(word) {
        const today = new Date().toDateString();
        try {
            const log = JSON.parse(localStorage.getItem(REVIEW_LOG_PREFIX + today) || '[]');
            if (!log.includes(word)) {
                log.push(word);
                localStorage.setItem(REVIEW_LOG_PREFIX + today, JSON.stringify(log));
            }
        } catch(e) {}
    }

    function getTodayDue() {
        const data = getSM2Data();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
        return Object.values(data).filter(c => c.nextReview >= todayStart && c.nextReview < tomorrowStart).length;
    }

    function updateStatsPanel() {
        const mastered = getMasteredCount();
        const due = getDueWords().length;
        const totalDays = getTotalDays();
        const todayCompleted = getTodayCompleted();
        const todayDue = getTodayDue();
        const progress = todayDue > 0 ? Math.min(100, Math.round(todayCompleted / todayDue * 100)) : 0;

        const el = id => document.getElementById(id);
        if (el('statMastered')) el('statMastered').textContent = mastered;
        if (el('statDue')) el('statDue').textContent = due;
        if (el('statDays')) el('statDays').textContent = totalDays;
        if (el('statToday')) el('statToday').textContent = todayCompleted;
        if (el('statProgressText')) el('statProgressText').textContent = todayCompleted + ' / ' + todayDue;
        if (el('statProgressFill')) el('statProgressFill').style.width = progress + '%';
    }

    function getSM2Data() {
        try { return JSON.parse(localStorage.getItem(SM2_PREFIX + 'data') || '{}'); } catch(e) { return {}; }
    }
    function saveSM2Data(data) { localStorage.setItem(SM2_PREFIX + 'data', JSON.stringify(data)); }

    function addToSM2(word) {
        const data = getSM2Data();
        if (!data[word]) {
            data[word] = {
                phase: 'ebb',
                ebbStep: 0,
                ease: 2.5,
                interval: 0,
                reps: 0,
                nextReview: Date.now() + EBB_INTERVALS_MS[0]
            };
            if (!localStorage.getItem('sm2_first_date')) {
                localStorage.setItem('sm2_first_date', Date.now());
            }
            saveSM2Data(data);
            updateDueCount();
            toast(`✅ "${word}" 已加入复习（20分钟后首次复习）`, 'success');
        } else {
            toast('已在复习列表中');
        }
    }

    function reviewWordSM2(word, quality) {
        const data = getSM2Data();
        const card = data[word];
        if (!card) return;

        logReview(word);

        if (card.phase === 'ebb') {
            if (quality >= 3) {
                card.ebbStep++;
                if (card.ebbStep >= EBB_INTERVALS_MS.length) {
                    card.phase = 'sm2';
                    card.reps = 0;
                    card.interval = 1;
                    card.nextReview = Date.now() + 24 * 60 * 60 * 1000;
                    toast(`📝 "${word}" 艾宾浩斯阶段完成，转入智能复习`, 'success');
                } else {
                    card.nextReview = Date.now() + EBB_INTERVALS_MS[card.ebbStep];
                    toast(`📝 "${word}" 评分通过，${EBB_LABELS[card.ebbStep]}再复习`, 'success');
                }
            } else {
                card.ebbStep = 0;
                card.nextReview = Date.now() + EBB_INTERVALS_MS[0];
                toast(`📝 "${word}" 评分困难，重新从20分钟后开始`, 'warning');
            }
        } else {
            if (quality >= 3) {
                if (card.reps === 0) card.interval = 1;
                else if (card.reps === 1) card.interval = 6;
                else card.interval = Math.round(card.interval * card.ease);
                card.reps++;
            } else {
                card.reps = 0;
                card.interval = 1;
            }
            card.ease = Math.max(1.3, Math.min(3.0, card.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))));
            card.nextReview = Date.now() + card.interval * 24 * 60 * 60 * 1000;
            const labels = {1: '困难', 3: '一般', 4: '简单', 5: '很简单'};
            toast(`📝 "${word}" 评分: ${labels[quality] || quality}，${card.interval}天后复习`, 'success');
        }

        saveSM2Data(data);
        updateDueCount();
    }

    function getDueWords() {
        const data = getSM2Data();
        const now = Date.now();
        return Object.entries(data).filter(([_, c]) => c.nextReview <= now).map(([word]) => word);
    }

    function updateDueCount() {
        const due = getDueWords();
        const data = getSM2Data();
        const totalWords = Object.keys(data).length;
        dueCountSpan.textContent = due.length;
        if (totalWords > 0) {
            reviewBtn.style.display = 'inline-flex';
            if (due.length > 0) {
                dueCountSpan.style.display = 'inline-flex';
            } else {
                dueCountSpan.style.display = 'none';
            }
        } else {
            dueCountSpan.style.display = 'none';
            reviewBtn.style.display = 'none';
        }
    }

    function isInSM2(word) {
        const data = getSM2Data();
        return !!data[word];
    }

    function getCardPhase(word) {
        const data = getSM2Data();
        const card = data[word];
        if (!card) return null;
        return card.phase || 'sm2';
    }

    // ===== 发音功能 (Web Speech API) =====
    function getBestVoice(lang) {
        var voices = window.speechSynthesis.getVoices();
        if (lang.startsWith('zh')) {
            return voices.find(function(v) { return /Premium|Neural|Enhanced|Quality/.test(v.name) && v.lang.startsWith('zh'); })
                || voices.find(function(v) { return v.lang.startsWith('zh'); });
        } else {
            return voices.find(function(v) { return /Premium|Neural|Enhanced|Quality/.test(v.name) && v.lang.startsWith('en'); })
                || voices.find(function(v) { return v.lang.startsWith('en-US') || v.lang.startsWith('en-GB'); })
                || voices.find(function(v) { return v.lang.startsWith('en'); });
        }
    }

    function speakWord(word) {
        if (!word) return;
        window.speechSynthesis.cancel();
        var utterance = new SpeechSynthesisUtterance(word);
        var voice = getBestVoice('en');
        if (voice) utterance.voice = voice;
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }

    function speakText(text) {
        if (!text) return;
        window.speechSynthesis.cancel();
        var utterance = new SpeechSynthesisUtterance(text);
        var voice = getBestVoice('zh');
        if (voice) utterance.voice = voice;
        utterance.lang = 'zh-CN';
        utterance.rate = 0.85;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
    }

    // ===== 渲染单词（原文优先 - 单词嵌入原文，支持短语） =====
    var wordResults = document.getElementById('wordResults');
    function renderWords(groups) {
        wordResults.style.display = 'block';
        wordResults.innerHTML = '';
        if (groups.length && typeof groups[0] === 'string') {
            groups = [{line: '', words: groups, phrases: []}];
        }
        if (!groups.length || !groups[0].words || !groups[0].words.length) {
            wordResults.style.display = 'none';
            wordResults.innerHTML = '';
            wordEditArea.style.display = 'none';
            return;
        }
        wordEditArea.style.display = 'block';
        const allWords = groups.reduce((acc, g) => acc.concat(g.words), []);
        const allPhrases = groups.reduce((acc, g) => acc.concat(g.phrases || []), []);
        var totalItems = allWords.length + allPhrases.length;
        wordCountSpan.textContent = '📊 ' + totalItems + ' 个（含 ' + allPhrases.length + ' 个短语）';

        groups.forEach((group) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'word-group';

            const origDiv = document.createElement('div');
            origDiv.className = 'group-original';

            function createWordTag(word) {
                const tag = document.createElement('span');
                tag.className = 'word-tag';
                if (getCached(word)) tag.classList.add('analyzed');
                if (isInSM2(word)) tag.classList.add('in-sm2');
                tag.textContent = word;
                tag.title = '左键分析 · 双击修改 · 右键删除';
                tag.onclick = () => handleWordAnalysis(word);
                tag.ondblclick = (e) => {
                    e.stopPropagation();
                    const newWord = prompt('修改单词 "' + word + '" 为:', word);
                    if (newWord && newWord.trim() && newWord !== word) {
                        const clean = newWord.trim().replace(/[^a-zA-Z-]/g, '');
                        if (clean) {
                            for (let g of groups) {
                                const wi = g.words.indexOf(word);
                                if (wi !== -1) { g.words[wi] = clean; break; }
                            }
                            localStorage.removeItem(CACHE_PREFIX + word.toLowerCase());
                            renderWords(groups);
                            toast('已修改为 "' + clean + '"', 'success');
                        }
                    }
                };
                tag.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (confirm('删除单词 "' + word + '"？')) {
                        for (let g of groups) {
                            const wi = g.words.indexOf(word);
                            if (wi !== -1) { g.words.splice(wi, 1); break; }
                        }
                        renderWords(groups);
                    }
                };
                return tag;
            }

            function createPhraseTag(phrase) {
                const tag = document.createElement('span');
                tag.className = 'word-tag phrase-tag';
                if (getCached(phrase)) tag.classList.add('analyzed');
                if (isInSM2(phrase)) tag.classList.add('in-sm2');
                tag.textContent = phrase;
                tag.title = '左键分析短语含义 · 右键删除';
                tag.onclick = () => handleWordAnalysis(phrase);
                tag.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (confirm('删除短语 "' + phrase + '"？')) {
                        for (let g of groups) {
                            const pi = (g.phrases || []).indexOf(phrase);
                            if (pi !== -1) { g.phrases.splice(pi, 1); break; }
                        }
                        renderWords(groups);
                    }
                };
                return tag;
            }

            if (group.line) {
                // 先按短语分割原文，再按单词分割
                var phrases = group.phrases || [];
                var line = group.line;
                // 构建一个正则，匹配所有短语（按长度降序，避免短短语先匹配）
                var sortedPhrases = phrases.slice().sort(function(a, b) { return b.length - a.length; });
                // 构建正则时，对每个短语的第一个动词支持进行时态（-ing形式）
                var phraseRegex = sortedPhrases.length ? new RegExp('(' + sortedPhrases.map(function(p) {
                    var pWords = p.split(' ');
                    var first = pWords[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    // 生成进行时态变体
                    var ingVariants = [first + 'ing'];
                    if (first.endsWith('e')) {
                        ingVariants.push(first.slice(0, -1) + 'ing');
                    }
                    if (first.length <= 4 && /[^aeiou]$/i.test(first) && /[aeiou][^aeiou]$/i.test(first)) {
                        ingVariants.push(first + first.slice(-1) + 'ing');
                    }
                    var firstPattern = '(?:' + [first].concat(ingVariants).join('|') + ')';
                    var restPattern = pWords.slice(1).map(function(w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('\\s+');
                    return '\\b' + firstPattern + '\\s+' + restPattern + '\\b';
                }).join('|') + ')', 'gi') : null;

                if (phraseRegex) {
                    // 用短语分割原文
                    var parts = line.split(phraseRegex);
                    parts.forEach(function(part) {
                        if (!part) return;
                        var lowerPart = part.toLowerCase().trim();
                        // 精确匹配短语（原形）
                        var matchedPhrase = sortedPhrases.find(function(p) { return p.toLowerCase() === lowerPart; });
                        if (matchedPhrase) {
                            origDiv.appendChild(createPhraseTag(matchedPhrase));
                        } else {
                            // 尝试进行时态匹配：将第一个词的-ing形式还原为原形
                            var matchedPhraseIng = sortedPhrases.find(function(p) {
                                var pWords = p.split(' ');
                                var firstOrig = pWords[0].toLowerCase();
                                // 检查 lowerPart 是否以 firstOrig 的进行时开头
                                var lowerWords = lowerPart.split(/\s+/);
                                if (lowerWords.length !== pWords.length) return false;
                                var firstLower = lowerWords[0];
                                // 检查第一个词是否是原形的进行时
                                var isIngForm = firstLower === firstOrig + 'ing' ||
                                    (firstOrig.endsWith('e') && firstLower === firstOrig.slice(0, -1) + 'ing') ||
                                    (firstOrig.length <= 4 && /[^aeiou]$/i.test(firstOrig) && /[aeiou][^aeiou]$/i.test(firstOrig) && firstLower === firstOrig + firstOrig.slice(-1) + 'ing');
                                if (!isIngForm) return false;
                                // 其余词必须完全匹配
                                for (var i = 1; i < lowerWords.length; i++) {
                                    if (lowerWords[i] !== pWords[i].toLowerCase()) return false;
                                }
                                return true;
                            });
                            if (matchedPhraseIng) {
                                origDiv.appendChild(createPhraseTag(matchedPhraseIng));
                            } else {
                                // 不是短语，按单词分割
                                var tokens = part.split(/(\s+|[.,!?;:'"()\[\]{}])/);
                                tokens.forEach(function(token) {
                                    var clean = token.replace(/[^a-zA-Z-]/g, '');
                                    if (clean && clean.length > 1 && group.words.includes(clean)) {
                                        origDiv.appendChild(createWordTag(clean));
                                    } else {
                                        var plain = document.createElement('span');
                                        plain.className = 'plain-text';
                                        plain.textContent = token;
                                        origDiv.appendChild(plain);
                                    }
                                });
                            }
                        }
                    });
                } else {
                    // 没有短语，按原方式渲染
                    var tokens = line.split(/(\s+|[.,!?;:'"()\[\]{}])/);
                    tokens.forEach(function(token) {
                        var clean = token.replace(/[^a-zA-Z-]/g, '');
                        if (clean && clean.length > 1 && group.words.includes(clean)) {
                            origDiv.appendChild(createWordTag(clean));
                        } else {
                            var plain = document.createElement('span');
                            plain.className = 'plain-text';
                            plain.textContent = token;
                            origDiv.appendChild(plain);
                        }
                    });
                }
            } else {
                // 没有原文，先显示短语再显示单词
                (group.phrases || []).forEach(function(phrase) {
                    origDiv.appendChild(createPhraseTag(phrase));
                    origDiv.appendChild(document.createTextNode(' '));
                });
                group.words.forEach(function(word) {
                    origDiv.appendChild(createWordTag(word));
                    origDiv.appendChild(document.createTextNode(' '));
                });
            }

            groupDiv.appendChild(origDiv);
            wordResults.appendChild(groupDiv);
        });

    }

    // ===== 友好化错误信息 =====
    function friendlyError(msg) {
        if (!msg) return '发生未知错误，请稍后重试';
        var lower = msg.toLowerCase();
        if (lower.indexOf('fetch') !== -1 || lower.indexOf('network') !== -1 || lower.indexOf('failed to fetch') !== -1) {
            return '网络连接失败，请检查网络后重试';
        }
        if (lower.indexOf('timeout') !== -1 || lower.indexOf('abort') !== -1) {
            return '请求超时，请稍后重试';
        }
        if (lower.indexOf('429') !== -1 || lower.indexOf('rate limit') !== -1) {
            return '请求过于频繁，请稍后再试';
        }
        if (lower.indexOf('500') !== -1 || lower.indexOf('502') !== -1 || lower.indexOf('503') !== -1) {
            return '服务暂时不可用，请稍后再试';
        }
        if (lower.indexOf('401') !== -1 || lower.indexOf('unauthorized') !== -1 || lower.indexOf('auth') !== -1) {
            return 'API 认证失败，请检查配置';
        }
        if (lower.indexOf('invalid') !== -1 || lower.indexOf('bad request') !== -1) {
            return '请求参数有误，请重试';
        }
        return msg;
    }

    // ===== AI 接口（通过后端代理，API Key 不在浏览器暴露） =====
    async function fetchAI(body) {
        // 如果启用了直连模式，直接调用 DeepSeek API（Key 会暴露）
        if (FALLBACK_DIRECT && DIRECT_API_KEY && DIRECT_API_KEY !== 'sk-your-key-here') {
            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + DIRECT_API_KEY
                },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(friendlyError(errData.error?.message || 'AI 请求失败: ' + res.status));
            }
            return res.json();
        }

        // 通过 Worker 代理（默认方式）
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 秒超时

        try {
            const res = await fetch(API_PROXY_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body),
                signal: controller.signal
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(friendlyError(errData.error || 'AI 请求失败: ' + res.status));
            }
            return res.json();
        } catch (e) {
            if (e.name === 'AbortError') {
                throw new Error('请求超时，请稍后重试');
            }
            throw new Error(friendlyError(e.message));
        } finally {
            clearTimeout(timeout);
        }
    }

    let originalOcrText = '';

    // 常见固定搭配/短语列表（用于本地提取）
    var COMMON_PHRASES = [
        // ===== 动词+介词/副词短语（日常高频） =====
        'touch down', 'take a turn', 'stock up', 'take a step back',
        'take off', 'take over', 'take on', 'take in', 'take away',
        'take back', 'take down', 'take out', 'take up', 'take apart',
        'break in', 'break through', 'break off', 'break away',
        'check in', 'check out', 'check up on', 'check over',
        'fill in', 'fill out', 'fill up',
        'hang out', 'hang up', 'hang on',
        'hold on', 'hold up', 'hold back', 'hold out',
        'move on', 'move out', 'move in',
        'pass out', 'pass away', 'pass by',
        'pick up', 'pick out',
        'pull up', 'pull over', 'pull off', 'pull through',
        'put on', 'put off', 'put down', 'put away', 'put out', 'put through',
        'sign in', 'sign up', 'sign off',
        'stand up', 'stand by', 'stand out', 'stand for',
        'stay up', 'stay in', 'stay out',
        'step up', 'step down', 'step in', 'step aside',
        'stop by', 'stop over',
        'turn down', 'turn up', 'turn around', 'turn away',
        'write down', 'write up', 'write off',
        'back up', 'back off', 'back down',
        'calm down', 'cool down', 'slow down', 'speed up',
        'settle down', 'shut down', 'shut up', 'shut off',
        'show around', 'clean up', 'clear up', 'close down', 'close up',
        'come across', 'come along', 'come up', 'come over', 'come out',
        'cut down', 'cut off', 'cut out', 'cut back',
        'drop by', 'drop off', 'drop out',
        'end up', 'fall apart', 'fall behind', 'fall down', 'fall off',
        'get along', 'get away', 'get back', 'get in', 'get off',
        'get on', 'get out', 'give back',
        'go after', 'go along', 'go away', 'go back', 'go by',
        'go down', 'go off', 'go out', 'go up',
        'hand in', 'hand out', 'hand over',
        'keep away', 'keep back', 'keep off', 'keep on',
        'kick off', 'knock out',
        'lay down', 'lay off',
        'leave behind', 'leave out',
        'let down', 'let go', 'let in', 'let out',
        'line up', 'live on', 'live up to',
        'look around', 'look back', 'look down on', 'look into',
        'look out', 'look over', 'look through',
        'make up', 'make out', 'mix up',
        'pay back', 'pay off',
        'pull out', 'push through', 'put together',
        'rule out', 'run across', 'run after',
        'run over', 'save up', 'set aside', 'set back', 'set in',
        'settle for', 'sit down', 'sit back',
        'sort out', 'speak up', 'split up',
        'start off', 'stick out',
        'stop off', 'talk into', 'talk out of',
        'tear down', 'tear up',
        'think ahead', 'think back', 'think through',
        'throw away', 'throw out',
        'tie up', 'try on', 'try out',
        'turn back', 'turn in', 'turn over',
        'use up', 'warm up', 'watch out',
        'wear out', 'wipe out', 'work on', 'work out', 'wrap up',
        'take care of', 'look after', 'look for', 'look forward to', 'look up to',
        'come up with', 'put up with', 'get rid of', 'make sure of',
        'make sense', 'make use of', 'take advantage of', 'take part in',
        'pay attention to', 'catch up with', 'keep up with',
        'turn out to be', 'turn into', 'turn off', 'turn on',
        'set up', 'set out', 'set off', 'set about',
        'bring about', 'bring up', 'bring out',
        'carry out', 'carry on', 'carry over',
        'point out', 'figure out', 'find out', 'work out',
        'give up', 'give in', 'give out', 'give away',
        'break down', 'break up', 'break out', 'break into',
        'run out of', 'run into', 'run away',
        'show up', 'show off', 'grow up', 'wake up',
        'go on', 'go over', 'go through', 'go ahead',
        'come back', 'come from', 'come in', 'come out',
        'get along with', 'get together', 'get over', 'get through',
        'think about', 'think of', 'think over',
        'talk about', 'talk over', 'hear about', 'hear from',
        'wait for', 'ask for', 'search for', 'hope for',
        'belong to', 'lead to', 'refer to', 'stick to', 'add to',
        'agree with', 'compare with', 'connect with', 'fill with',
        'provide with', 'equip with',
        'apologize for', 'prepare for', 'blame for',
        'apply for', 'arrange for', 'account for',
        'suffer from', 'result from', 'come from', 'differ from',
        'protect from', 'prevent from',
        'divide into', 'separate into', 'put into',
        'believe in', 'succeed in', 'result in', 'engage in',

        // ===== 更多动词+介词固定搭配 =====
        'abide by', 'accuse of', 'adapt to', 'adjust to',
        'agree on', 'aim at', 'appeal to', 'apply to',
        'approve of', 'argue about', 'arrive at', 'arrive in',
        'ask about', 'benefit from', 'boast about',
        'borrow from', 'care about', 'care for', 'charge for',
        'collide with', 'comment on', 'communicate with',
        'compare to', 'compete with', 'complain about',
        'concentrate on', 'confess to', 'conflict with',
        'congratulate on', 'connect to', 'cooperate with',
        'cope with', 'correspond to', 'count on',
        'cover with', 'crash into', 'cure of',
        'decide on', 'defend against', 'delight in',
        'depart from', 'derive from', 'despair of',
        'die of', 'disagree with', 'disapprove of',
        'discourage from', 'discuss with', 'distinguish from',
        'distribute to', 'divide among', 'dream of',
        'dress in', 'eliminate from', 'emerge from',
        'emphasize on', 'escape from', 'excel at',
        'excuse for', 'experiment with', 'explain to',
        'export to', 'extend to', 'extract from',
        'fail in', 'feed on', 'fight against', 'fight for',
        'focus on', 'forbid from', 'forgive for',
        'free from', 'gaze at', 'glance at', 'glare at',
        'grapple with', 'grieve for', 'guard against',
        'guess at', 'happen to', 'hear of',
        'help with', 'hide from', 'hinder from',
        'hint at', 'hunt for', 'hurry to',
        'identify with', 'import from', 'impose on',
        'impress with', 'improve on', 'include in',
        'indulge in', 'inform of', 'inquire about',
        'integrate into', 'interact with', 'interpret as',
        'introduce to', 'invest in', 'invite to',
        'involve in', 'isolate from', 'join in',
        'joke about', 'judge by', 'jump at',
        'keep from', 'knock at', 'know about',
        'laugh at', 'launch into', 'lean on',
        'leap at', 'leave for', 'lend to',
        'lie about', 'limit to', 'link to',
        'listen to', 'live by', 'live for',
        'long for', 'look at', 'lose in',
        'major in', 'meet with', 'mistake for',
        'mix with', 'model after', 'mourn for',
        'move to', 'name after', 'negotiate with',
        'note for', 'object to', 'obtain from',
        'occur to', 'operate on', 'opt for',
        'originate from', 'participate in', 'persist in',
        'persuade of', 'pray for', 'prefer to',
        'preside over', 'press for', 'prevail over',
        'pride on', 'prohibit from',
        'protest against', 'punish for',
        'quarrel about', 'quote from',
        'reach for', 'react to', 'reason with',
        'rebel against', 'receive from',
        'reflect on', 'refrain from', 'regard as',
        'register for', 'rejoice at', 'relate to',
        'release from', 'remark on',
        'remember for', 'remind of', 'remove from',
        'replace with', 'reply to', 'report on',
        'request for', 'rescue from', 'resign from',
        'resist to', 'resolve into', 'respond to',
        'rest on', 'restore to', 'restrain from',
        'retire from', 'retreat from', 'return to',
        'revenge on', 'revolt against', 'reward for',
        'rid of', 'rob of', 'save from',
        'separate from', 'serve as',
        'shelter from', 'shoot at', 'shout at',
        'shrink from', 'shy away from', 'side with',
        'sigh about', 'sign for', 'sink into',
        'sketch out', 'smile at', 'smuggle into',
        'sneer at', 'sniff at', 'specialize in',
        'speculate about', 'spend on', 'split into',
        'spy on', 'squeeze into', 'stare at',
        'starve for', 'stem from',
        'stir up', 'strive for', 'struggle against',
        'struggle for', 'stumble upon', 'submit to',
        'subscribe to', 'substitute for', 'subtract from',
        'suggest to', 'suit to', 'sum up',
        'supply with', 'suspect of', 'sympathize with',
        'taste of', 'tease about', 'tend to',
        'testify to', 'thank for',
        'thirst for', 'threaten with', 'throw at',
        'tie to', 'tire of', 'trade with',
        'translate into', 'treat with', 'trick into',
        'triumph over', 'trust in', 'try for',
        'tune in', 'urge to', 'use for',
        'value for', 'venture into', 'vote for',
        'vote against', 'warn about', 'watch for',
        'wish for', 'withdraw from', 'wonder about',
        'work at', 'worry about', 'worship of',
        'yearn for', 'yield to',

        // ===== 介词/副词固定搭配 =====
        'in spite of', 'as well as', 'as long as', 'as soon as', 'as far as',
        'on the other hand', 'on the contrary', 'on behalf of', 'on account of',
        'in addition to', 'in front of', 'in order to', 'in terms of', 'in case of',
        'in charge of', 'in favor of', 'in place of', 'in search of',
        'by the way', 'by means of', 'by virtue of',
        'at the end of', 'at the beginning of', 'at the expense of',
        'with respect to', 'with regard to', 'with the exception of',
        'due to', 'owing to', 'thanks to', 'according to', 'subject to',
        'in advance', 'in detail', 'in public', 'in private',
        'in return', 'in turn', 'in vain', 'in common',
        'in practice', 'in theory', 'in progress', 'in stock',
        'in trouble', 'in danger', 'in need', 'in debt',
        'in a row', 'in a hurry', 'in a way', 'in no time',
        'on purpose', 'on average', 'on business', 'on duty',
        'on fire', 'on foot', 'on holiday', 'on sale',
        'on schedule', 'on second thought', 'on the air',
        'on the go', 'on the rise', 'on the run',
        'on the spot', 'on the whole',
        'out of breath', 'out of control', 'out of date',
        'out of order', 'out of place', 'out of question',
        'out of reach', 'out of sight', 'out of stock',
        'out of work', 'out of the way',
        'at best', 'at worst', 'at ease', 'at hand',
        'at heart', 'at large', 'at leisure', 'at length',
        'at liberty', 'at peace', 'at present', 'at random',
        'at risk', 'at stake', 'at will', 'at work',
        'by accident', 'by all means', 'by chance',
        'by choice', 'by design', 'by force',
        'by hand', 'by heart', 'by mistake',
        'by nature', 'by no means',
        'for free', 'for good', 'for sure',
        'for the better', 'for the worse', 'for the record',

        // ===== 形容词+介词搭配 =====
        'accustomed to', 'addicted to', 'allergic to',
        'committed to', 'dedicated to', 'devoted to',
        'exposed to', 'limited to', 'married to',
        'opposed to', 'related to',
        'blessed with', 'burdened with', 'crowded with',
        'equipped with', 'familiar with',
        'loaded with', 'packed with',
        'pleased with', 'satisfied with',
        'associated with', 'connected with',
        'concerned about', 'excited about', 'happy about',
        'serious about', 'upset about', 'worried about',
        'angry at', 'skilled at', 'amazed at', 'surprised at',
        'absent from', 'recovered from', 'tired from',
        'known for', 'famous for', 'suitable for',
        'grateful for', 'ready for', 'available for',
        'anxious for', 'eligible for', 'qualified for',
        'dependent on', 'keen on', 'based on', 'focused on',
        'hard on', 'tough on', 'cruel to', 'kind to',
        'polite to', 'rude to',

        // ===== 名词+介词搭配 =====
        'advantage of', 'cause of', 'example of',
        'lack of', 'possibility of', 'result of',
        'access to', 'answer to', 'attitude to',
        'contribution to', 'damage to', 'reaction to',
        'solution to', 'approach to',
        'belief in', 'change in', 'difference in',
        'increase in', 'confidence in', 'difficulty in',
        'interest in', 'success in',

        // ===== 常见固定表达 =====
        'a bit', 'a great deal',
        'a lot', 'above all', 'after all',
        'all along', 'all but', 'all over', 'all right',
        'as a result', 'as a rule', 'as usual', 'as well',
        'back and forth', 'by and large',
        'day and night',
        'face to face', 'far and wide',
        'first and foremost',
        'from now on',
        'hand in hand', 'heart and soul',
        'here and there', 'in and out',
        'little by little', 'more and more',
        'now and then', 'off and on',
        'once and for all', 'one after another',
        'one by one', 'over and over',
        'right away', 'side by side',
        'so far', 'so to speak',
        'the more the more', 'to and fro',
        'up and down', 'upside down',
        'well off', 'worse off',

        // ===== 情态动词/动词结构 =====
        'used to', 'ought to', 'have to', 'need to', 'want to',
        'be able to', 'be going to', 'be about to', 'be supposed to',
        'had better', 'would rather', 'would like to',
        'would sooner', 'may as well', 'might as well',
        'be bound to', 'be likely to', 'be willing to',
        'be allowed to', 'be forced to', 'be required to',

        // ===== 多词短语 =====
        'first of all', 'in the first place', 'last but not least',
        'more or less', 'sooner or later', 'step by step',
        'all of a sudden', 'once upon a time', 'no matter what',
        'no wonder', 'no doubt', 'no longer', 'no more',
        'at least', 'at most', 'at once', 'at first', 'at last',
        'in fact', 'in short', 'in brief', 'in general', 'in particular',
        'for example', 'for instance', 'for the time being',
        'on time', 'in time', 'at times', 'from time to time',
        'all the time', 'at the same time',
        'each other', 'one another', 'a few', 'a little',
        'plenty of', 'lots of', 'a great deal of',
        'the rest of', 'the majority of', 'the number of',
        'a lot of', 'a number of', 'a variety of', 'a series of', 'a couple of',
        'a bit of', 'a piece of', 'a pair of',
        'as a matter of fact', 'as far as is concerned',
        'at the cost of', 'at the mercy of', 'at the risk of',
        'by the end of',
        'for the benefit of', 'for the purpose of', 'for the sake of',
        'in the absence of', 'in the course of', 'in the event of',
        'in the face of', 'in the habit of', 'in the interest of',
        'in the light of', 'in the middle of', 'in the name of',
        'in the neighborhood of', 'in the process of', 'in the wake of',
        'on the basis of', 'on the edge of', 'on the eve of',
        'on the grounds of', 'on the occasion of', 'on the part of',
        'on the point of', 'on the verge of',
        'under the circumstances', 'under the influence of',
        'with the help of',

        // ===== 连接词/从句引导词 =====
        'not only...but also', 'either...or', 'neither...nor', 'both...and',
        'so that', 'such that', 'now that', 'provided that',
        'even if', 'even though', 'as if', 'as though',
        'in order that', 'for fear that', 'in case that',

        // ===== 比较/关系结构 =====
        'the same as', 'different from', 'similar to', 'related to',
        'interested in', 'responsible for', 'capable of', 'aware of',
        'full of', 'short of', 'fond of', 'proud of', 'afraid of',
        'good at', 'bad at', 'expert at', 'quick at',

        // ===== 动词+动词/不定式结构 =====
        'deal with', 'depend on', 'rely on', 'insist on', 'consist of',
        'not only...but also', 'either...or', 'neither...nor', 'both...and',
        'so that', 'such that', 'now that', 'provided that',
        'even if', 'even though', 'as if', 'as though',
        'in order that', 'for fear that', 'in case that',
        'the same as', 'different from', 'similar to', 'related to',
        'interested in', 'responsible for', 'capable of', 'aware of',
        'full of', 'short of', 'fond of', 'proud of', 'afraid of',
        'good at', 'bad at', 'expert at', 'quick at',
        'used to', 'ought to', 'have to', 'need to', 'want to',
        'be able to', 'be going to', 'be about to', 'be supposed to',
        'had better', 'would rather', 'would like to',
        'first of all', 'in the first place', 'last but not least',
        'more or less', 'sooner or later', 'step by step',
        'all of a sudden', 'once upon a time', 'no matter what',
        'no wonder', 'no doubt', 'no longer', 'no more',
        'at least', 'at most', 'at once', 'at first', 'at last',
        'in fact', 'in short', 'in brief', 'in general', 'in particular',
        'for example', 'for instance', 'for the time being',
        'on time', 'in time', 'at times', 'from time to time',
        'all the time', 'at the same time',
        'each other', 'one another', 'a few', 'a little',
        'plenty of', 'lots of', 'a great deal of',
        'the rest of', 'the majority of', 'the number of'
    ];

    function extractWordsLocally(text) {

        const paragraphs = text.split(/\n\s*\n/);
        const groups = [];
        for (const para of paragraphs) {
            if (!para.trim()) continue;
            // 先提取短语
            var lowerText = para.toLowerCase();
            var foundPhrases = [];
            var phraseMatches = {};
            // 按长度降序匹配短语，避免短短语先匹配
            var sortedPhrases = COMMON_PHRASES.slice().sort(function(a, b) { return b.split(' ').length - a.split(' ').length; });
            sortedPhrases.forEach(function(phrase) {
                var words = phrase.split(' ');
                // 对短语的第一个动词生成进行时态变体（-ing形式）
                var firstWord = words[0];
                // 常见动词进行时态规则：去掉末尾e加ing、双写末尾辅音加ing、直接加ing
                var ingVariants = [firstWord + 'ing'];
                if (firstWord.endsWith('e')) {
                    ingVariants.push(firstWord.slice(0, -1) + 'ing');
                }
                // 对于单辅音结尾的短动词，双写加ing（如 run→running, sit→sitting）
                if (firstWord.length <= 4 && /[^aeiou]$/i.test(firstWord) && /[aeiou][^aeiou]$/i.test(firstWord)) {
                    ingVariants.push(firstWord + firstWord.slice(-1) + 'ing');
                }
                // 构建正则：第一个词支持原形或进行时，其余词精确匹配
                var firstPattern = '(?:' + [firstWord].concat(ingVariants).join('|') + ')';
                var restPattern = words.slice(1).map(function(w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('\\s+');
                var fullPattern = '\\b' + firstPattern + '\\s+' + restPattern + '\\b';
                var regex = new RegExp(fullPattern, 'gi');
                var match;
                while ((match = regex.exec(lowerText)) !== null) {
                    foundPhrases.push(phrase);
                    phraseMatches[match.index] = phrase;
                }
            });
            // 去重
            foundPhrases = [...new Set(foundPhrases)];

            // 从原文中移除短语中的单词，提取剩余单词
            var words = para.match(/[a-zA-Z][a-zA-Z-]{1,}[a-zA-Z]|[a-zA-Z]{2,}/g) || [];
            // 过滤掉属于短语的单词
            var phraseWords = {};
            foundPhrases.forEach(function(phrase) {
                phrase.split(' ').forEach(function(pw) {
                    phraseWords[pw.toLowerCase()] = true;
                });
            });
            var filteredWords = words.filter(function(w) {
                return !phraseWords[w.toLowerCase()];
            });
            var uniqueWords = [...new Set(filteredWords.map(w => w.toLowerCase()))]
                .filter(w => {
                    if (w.length < 2) return false;
                    if (/^[A-Z]{1,2}$/.test(w)) return false;
                    return true;
                })
                .map(w => {
                    const orig = words.find(o => o.toLowerCase() === w);
                    return orig || w;
                });
            if (uniqueWords.length || foundPhrases.length) {
                groups.push({line: para.trim(), words: uniqueWords, phrases: foundPhrases});
            }
        }
        if (!groups.length) {
            const words = text.match(/[a-zA-Z][a-zA-Z-]{1,}[a-zA-Z]|[a-zA-Z]{2,}/g) || [];
            const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))]
                .filter(w => w.length >= 2 && !/^[A-Z]{1,2}$/.test(w))
                .map(w => {
                    const orig = words.find(o => o.toLowerCase() === w);
                    return orig || w;
                });
            if (uniqueWords.length) {
                groups.push({line: text.trim(), words: uniqueWords, phrases: []});
            }
        }
        return groups;
    }

    async function extractWordsByAI(text) {
        let groups = [];
        try {
            const data = await fetchAI({
                model: 'deepseek-chat',
                messages: [{role: 'user', content: '你是一个 OCR 后处理专家。请对以下 OCR 识别出的英文文本执行以下步骤：\n\n步骤1：OCR 纠错\n- 纠正拼写错误（如 rn→m, l→1, 0→O, 5→S 等常见 OCR 错误）\n- 修复大小写错误\n\n步骤2：修复单词边界\n- 拆分粘连的单词（如 "thequickbrown" → "the quick brown"）\n- 合并错误分割的单词（如 "t he" → "the"）\n\n步骤3：按段落（空行分隔）分组，每段提取其中的英文单词（去重）以及固定搭配/短语\n\n请严格按以下 JSON 对象格式返回（不要 markdown 包裹）：\n{"groups": [{"line": "该段纠错修复后的原文内容", "words": ["word1", "word2"], "phrases": ["phrase1", "phrase2"]}]}\n\n注意：\n1. 每个段落一个对象，line 字段保存该段纠错修复后的原文\n2. words 字段保存该段中提取的所有不重复英文单词（仅保留字母和连字符，长度≥2），排除纯数字、单字母等无效内容\n3. phrases 字段只保存真正的固定搭配/习语/短语动词（如 "take care of", "look after", "in spite of", "as well as", "on the other hand", "break down", "come up with" 等），**不要将普通句子片段（如 "many of these", "may still", "these facilities" 等）识别为短语**\n4. 短语中的单词应从 words 中移除（避免重复），例如原文有 "take care of"，则 words 中不应包含 take/care/of，而是放在 phrases 中\n5. 如果文本没有空行分隔，则整个文本作为一个段落\n6. 如果有多个段落，必须返回多个对象，每个对象对应一个段落\n\n文本：\n' + text}],

                max_tokens: 3000, temperature: 0.1,
                response_format: {type: 'json_object'}
            });
            const result = JSON.parse(data.choices[0].message.content);
            if (result.groups && Array.isArray(result.groups)) {
                groups = result.groups;
            } else if (result.lines && Array.isArray(result.lines)) {
                groups = result.lines;
            } else if (result.words && Array.isArray(result.words)) {
                groups = [{line: '', words: result.words, phrases: result.phrases || []}];
            } else if (result.result && Array.isArray(result.result)) {
                groups = result.result;
            } else {
                for (const key of Object.keys(result)) {
                    if (Array.isArray(result[key])) {
                        groups = result[key];
                        break;
                    }
                }
            }
            if (groups && groups.length) {
                for (const g of groups) {
                    if (g.words && Array.isArray(g.words)) {
                        g.words = g.words.filter(w => {
                            const clean = w.replace(/[^a-zA-Z-]/g, '');
                            if (clean.length < 2) return false;
                            if (!/[a-zA-Z]/.test(clean)) return false;
                            if (/^[A-Z]{1,2}$/.test(clean)) return false;
                            return true;
                        });
                        g.words = [...new Set(g.words)];
                    }
                    if (!g.phrases) g.phrases = [];
                }
            }
        } catch(e) {
            console.warn('AI 提取失败，回退到本地提取:', e.message);
        }
        if (!groups.length || !groups[0].words || !groups[0].words.length) {
            groups = extractWordsLocally(text);
        }
        return groups;
    }

    async function analyzeByAI(word) {
        const cached = getCached(word);
        if (cached) return cached;
        const prompt = '分析英文单词 "' + word + '"，返回严格 JSON 格式（不要 markdown 包裹）：{\n' +
            '  "phonetic": "音标（如 /ɪɡˈzæmpəl/）",\n' +
            '  "meaning": "中文释义（多个含义用分号隔开，如：n. 例子，榜样；v. 举例说明）",\n' +
            '  "part_of_speech": "词性（如 v./n./adj./adv.）",\n' +
            '  "meanings": [\n' +
            '    {"meaning": "第一个含义（含词性）", "example": "对应例句（英文+中文翻译）"},\n' +
            '    {"meaning": "第二个含义（含词性）", "example": "对应例句（英文+中文翻译）"}\n' +
            '  ],\n' +
            '  "root": "词根",\n' +
            '  "root_meaning": "词根含义",\n' +
            '  "prefix": "前缀（若无则空字符串）",\n' +
            '  "prefix_meaning": "前缀含义",\n' +
            '  "suffix": "后缀（若无则空字符串）",\n' +
            '  "suffix_meaning": "后缀含义",\n' +
            '  "inflections": {\n' +
            '    "plural": "复数形式（如果是名词，必须填写；否则空字符串）",\n' +
            '    "past_tense": "过去式（如果是动词，必须填写；否则空字符串）",\n' +
            '    "past_participle": "过去分词（如果是动词，必须填写；否则空字符串）",\n' +
            '    "present_participle": "现在分词（如果是动词，必须填写；否则空字符串）",\n' +
            '    "comparative": "比较级（如果是形容词/副词，必须填写；否则空字符串）",\n' +
            '    "superlative": "最高级（如果是形容词/副词，必须填写；否则空字符串）"\n' +
            '  },\n' +
            '  ⚠️ 重要：如果当前单词本身就是某种变形形式（如 blossomed 是过去式/过去分词，running 是现在分词），inflections 中对应的字段必须填写该单词本身，且原型应在 meanings 中体现。例如分析 "blossomed" 时，inflections.past_tense 和 inflections.past_participle 都应为 "blossomed"，而原型 "blossom" 应在 meaning 字段中体现。\n' +
              '  "etymology": "词根来源（如：拉丁语 spectare=看）| 词根记忆场景（严格遵循以下要求）| 地道例句（严格遵循以下要求）\n\n场景要求（必须同时满足）：\n1. 必须是日常生活中真实发生的场景（如安检、做饭、坐车、看病、购物），不能是抽象概念或学术描述\n2. 场景中必须包含该词根的核心含义，让人一读就能联想到词根的意思\n3. 场景要有画面感，用具体名词+动作描述，让人能在脑海中浮现画面\n4. 格式：场景描述 → 记住 词根=含义\n\n例句要求（必须同时满足）：\n1. 必须包含当前学习的单词\n2. 例句情境必须与记忆场景完全一致（同一场景、同一语境）\n3. 使用 COCA 语料库中的常见搭配，句子自然地道\n4. 例句后附中文翻译\n\n示例：spect（拉丁语 specere=看）| 安检员打开你的包仔细查看 → 记住 spect=看 | The security guard inspected my bag before I boarded the flight.（登机前安检员检查了我的包）",\n' +
            '  "example_sentence": "英文例句（带中文翻译，格式如：\"The example is clear. 这个例子很清楚。\"）",\n' +
            '  "collocations": [{"text": "搭配1（中文释义）", "phonetic": "/音标/"}, {"text": "搭配2（中文释义）", "phonetic": "/音标/"}],\n' +
            '  "synonyms": [{"word": "同义词1", "phonetic": "/音标/", "meaning": "中文释义"}, {"word": "同义词2", "phonetic": "/音标/", "meaning": "中文释义"}],\n' +
            '  "antonyms": [{"word": "反义词1", "phonetic": "/音标/", "meaning": "中文释义"}, {"word": "反义词2", "phonetic": "/音标/", "meaning": "中文释义"}],\n' +
            '  "frequency": "词频等级（高频词/中频词/低频词）",\n' +
              '  "related_words": [{"word": "同根词", "phonetic": "/音标/", "meaning": "含义", "part_of_speech": "词性", "frequency": "高频词/中频词/低频词/罕见词"}]\n' +
              '  // ⚠️ related_words 请根据该词根的丰富程度灵活给出数量：词根衍生词多的（如 spect, duct, struct）给出 6-10 个，少的给出所有能找到的。尽量覆盖不同前缀（pre-, re-, in-, de-, pro-, con-, ex- 等）的组合。每个词必须标注 frequency 字段，值必须是"高频词"/"中频词"/"低频词"/"罕见词"之一，与主分析的词频等级保持一致\n' +
            '}\n\n' +
            '⚠️ 重要要求：\n' +
            '1. meanings 数组中的每个元素必须包含 meaning 和 example 字段，example 是对应该含义的地道英文例句（含中文翻译）\n' +
            '2. meanings 数组的顺序与 meaning 字段中多个含义的顺序一致\n' +
            '3. synonyms 数组中每个对象的 meaning 字段必须填写该同义词的中文释义，不能为空字符串\n' +
            '4. antonyms 数组中每个对象的 meaning 字段必须填写该反义词的中文释义，不能为空字符串\n' +
            '5. 请提供至少 2-3 个同义词和反义词，每个都必须有中文释义\n' +
             '6. 如果某个同义词或反义词没有常见的中文释义，请根据其英文含义给出准确的中文翻译\n\n' +
            '你是一位词根词缀导师。分析完单词后，如果用户追问，你要：\n' +
            '1. 用已知词根引出相关词汇，举一反三\n' +
            '2. 鼓励用户思考，用提问引导而不是直接给答案\n' +
            '3. 回答简洁有温度，像一位耐心的老师';
        const data = await fetchAI({
            model: 'deepseek-chat',
            messages: [{role: 'user', content: prompt}],
            max_tokens: 2000, temperature: 0.3,
            response_format: {type: 'json_object'}
        });
        const result = JSON.parse(data.choices[0].message.content);
        setCache(word, result);
        return result;
    }

    // ===== 单词分析 =====
    async function handleWordAnalysis(word) {
        // 不覆盖 analysisResult 区域，在页面顶部显示 loading 提示条
        // 这样用户当前查看的分析结果不会被覆盖
        var loadingBar = document.createElement('div');
        loadingBar.id = 'analysisLoading_' + word.replace(/[^a-zA-Z-]/g, '');
        loadingBar.style.cssText = 'position:sticky;top:0;z-index:100;text-align:center;padding:0.6rem 1rem;background:var(--primary);color:white;border-radius:var(--radius);margin-bottom:0.75rem;animation:fadeInUp 0.3s ease;box-shadow:var(--shadow-md);font-size:0.9rem;font-weight:500;display:flex;align-items:center;justify-content:center;gap:0.5rem;';
        loadingBar.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;"></span> 🔍 正在分析 "' + word + '" ...';
        var wordResultsEl = document.getElementById('wordResults');
        if (wordResultsEl && wordResultsEl.parentNode) {
            wordResultsEl.parentNode.insertBefore(loadingBar, wordResultsEl);
        } else {
            analysisResult.parentNode.insertBefore(loadingBar, analysisResult);
        }

        // 15 秒超时提示
        var slowTimer = setTimeout(function() {
            loadingBar.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;"></span> ⏳ "' + word + '" 请求较慢，请耐心等待...<br><small style="opacity:0.8;">首次分析需要调用 AI，通常需要 10-20 秒</small>';
        }, 15000);

        try {
            const r = await analyzeByAI(word);
            clearTimeout(slowTimer);
            // 移除 loading 提示条
            if (loadingBar.parentNode) loadingBar.parentNode.removeChild(loadingBar);
            const inSM2 = isInSM2(word);
            const phoneticHtml = r.phonetic
                ? '<span class="phonetic-display" onclick="window.speakWord(\'' + word + '\')" title="点击发音" style="font-size:0.8rem;font-weight:400;background:rgba(255,255,255,0.15);padding:0.1rem 0.6rem;border-radius:50px;vertical-align:middle;margin-left:0.5rem;cursor:pointer;">' + r.phonetic + '</span>'
                : '';
            const speakBtnHtml = '<button class="speak-btn" onclick="window.speakWord(\'' + word + '\')" title="朗读" style="font-size:1.1rem;background:none;border:none;cursor:pointer;padding:0.1rem 0.3rem;vertical-align:middle;">🔊</button>';

            const html = '' +
                '<div class="analysis-card-header">' +
                    (function() {
                        // 卡片标题：只显示单词 + 词性 + 音标，不显示变形类型标签
                        var posHtml = r.part_of_speech ? ' <span style="font-size:0.7rem;font-weight:400;background:rgba(255,255,255,0.2);padding:0.15rem 0.6rem;border-radius:50px;vertical-align:middle;">' + r.part_of_speech + '</span>' : '';
                        return '<h3>' + word + posHtml + phoneticHtml + speakBtnHtml + '</h3>';
                    })() +
                    '<div>' +
                        '<button class="copy-btn" onclick="window.copyAnalysis(\'' + word + '\')" title="复制分析结果">📋 复制</button>' +
                    '</div>' +
                '</div>' +
                '<div class="analysis-card-body">' +
                    '<div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">' +
                        '<div style="flex:1;">' +
                            '<div class="meaning-text">' + (r.meaning || '') +
                                (r.frequency ? (function(f) {
                                    const colors = {'高频词': '#ef4444', '中频词': '#f59e0b', '低频词': '#10b981'};
                                    const bgColors = {'高频词': '#fef2f2', '中频词': '#fffbeb', '低频词': '#f0fdf4'};
                                    const color = colors[f] || '#64748b';
                                    const bg = bgColors[f] || '#f1f5f9';
                                    return ' <span style="font-size:0.7rem;font-weight:500;color:' + color + ';background:' + bg + ';padding:0.15rem 0.6rem;border-radius:50px;vertical-align:middle;margin-left:0.5rem;">' + f + '</span>';
                                })(r.frequency) : '') +
                            '</div>' +
                        '</div>' +
                        '<div>' +
                            (inSM2
                                ? '<span style="background:#d1fae5;color:#065f46;padding:0.4rem 1rem;border-radius:50px;font-size:0.85rem;">✅ 已加入复习</span>'
                                : '<button class="btn-accent btn-sm" onclick="window.addToSM2(\'' + word + '\')">➕ 加入复习</button>'
                            ) +
                        '</div>' +
                    '</div>' +
                    '<div class="morphology-grid">' +
                        '<div class="morphology-card" onclick="window.speakWord(\'' + (r.root || '').replace(/'/g, "\\'") + '\')" style="cursor:pointer;"><div class="label">🧩 词根</div><div class="value">' + (r.root || '—') + '</div><div class="meaning">' + (r.root_meaning || '') + '</div></div>' +
                        (r.prefix ? '<div class="morphology-card" onclick="window.speakWord(\'' + r.prefix.replace(/'/g, "\\'") + '\')" style="cursor:pointer;"><div class="label">⬅️ 前缀</div><div class="value">' + r.prefix + '</div><div class="meaning">' + (r.prefix_meaning || '') + '</div></div>' : '') +
                        (r.suffix ? '<div class="morphology-card" onclick="window.speakWord(\'' + r.suffix.replace(/'/g, "\\'") + '\')" style="cursor:pointer;"><div class="label">➡️ 后缀</div><div class="value">' + r.suffix + '</div><div class="meaning">' + (r.suffix_meaning || '') + '</div></div>' : '') +
                    '</div>' +
                    (function() {
                        // 使用本地词形变化引擎，不依赖 AI 的 inflections 数据
                        var inf = r.inflections || {};
                        // 先用 findBaseForm 判断当前单词是否是变形形式
                        var baseInfo = findBaseForm(word);
                        var originWord = baseInfo.baseForm;
                        // 用本地引擎生成所有变形形式
                        var localInf = getInflections(originWord);
                        // 合并：本地引擎只贡献动词变形（不规则动词表精确匹配）
                        // 复数/比较级/最高级完全依赖 AI（本地引擎不生成这些）
                        var mergedInf = {
                            plural: inf.plural || '',           // 完全依赖 AI
                            past_tense: localInf.past_tense || inf.past_tense || '',  // 本地优先（不规则动词），AI 兜底
                            past_participle: localInf.past_participle || inf.past_participle || '',
                            present_participle: localInf.present_participle || inf.present_participle || '',
                            comparative: inf.comparative || '',  // 完全依赖 AI
                            superlative: inf.superlative || ''   // 完全依赖 AI
                        };
                        // 根据词性精确过滤不相关的变形形式
                        // 支持多种格式：v./v/verb、n./n/noun、adj./adj/adjective、adv./adv/adverb
                        var pos = (r.part_of_speech || '').toLowerCase();
                        var isVerb = /v\.?/.test(pos) || pos.indexOf('verb') !== -1;
                        var isNoun = /n\.?/.test(pos) && !/v\.?/.test(pos) && pos.indexOf('verb') === -1;
                        var isAdj = /adj\.?/.test(pos) || pos.indexOf('adjective') !== -1;
                        var isAdv = /adv\.?/.test(pos) || pos.indexOf('adverb') !== -1;
                        // 代词/介词/连词/冠词/感叹词/数词等：不显示任何变形
                        var isOther = /pron\.?|prep\.?|conj\.?|art\.?|interj\.?|num\.?/.test(pos) ||
                            pos.indexOf('pronoun') !== -1 || pos.indexOf('preposition') !== -1 ||
                            pos.indexOf('conjunction') !== -1 || pos.indexOf('article') !== -1;

                        const items = [];
                        // 不显示原型行，只显示变形形式
                        // 复数：仅名词显示（且不是其他词性）
                        if (mergedInf.plural && isNoun && !isOther) items.push('<span class="inflection-item" onclick="window.speakWord(\'' + mergedInf.plural.replace(/'/g, "\\'") + '\')" style="cursor:pointer;"><span class="label">复数</span><span class="value">' + mergedInf.plural + '</span></span>');
                        // 过去式/过去分词/现在分词：仅动词显示
                        if (mergedInf.past_tense && isVerb) items.push('<span class="inflection-item" onclick="window.speakWord(\'' + mergedInf.past_tense.replace(/'/g, "\\'") + '\')" style="cursor:pointer;"><span class="label">过去式</span><span class="value">' + mergedInf.past_tense + '</span></span>');
                        if (mergedInf.past_participle && isVerb) items.push('<span class="inflection-item" onclick="window.speakWord(\'' + mergedInf.past_participle.replace(/'/g, "\\'") + '\')" style="cursor:pointer;"><span class="label">过去分词</span><span class="value">' + mergedInf.past_participle + '</span></span>');
                        if (mergedInf.present_participle && isVerb) items.push('<span class="inflection-item" onclick="window.speakWord(\'' + mergedInf.present_participle.replace(/'/g, "\\'") + '\')" style="cursor:pointer;"><span class="label">现在分词</span><span class="value">' + mergedInf.present_participle + '</span></span>');
                        // 第三人称单数：仅动词显示（当前单词是第三人称单数时）
                        if (isVerb && baseInfo.isInflected && baseInfo.inflectionType === '第三人称单数') {
                            items.push('<span class="inflection-item" onclick="window.speakWord(\'' + word.replace(/'/g, "\\'") + '\')" style="cursor:pointer;"><span class="label">第三人称单数</span><span class="value">' + word + '</span></span>');
                        }
                        // 比较级/最高级：仅形容词/副词显示
                        if (mergedInf.comparative && (isAdj || isAdv)) items.push('<span class="inflection-item" onclick="window.speakWord(\'' + mergedInf.comparative.replace(/'/g, "\\'") + '\')" style="cursor:pointer;"><span class="label">比较级</span><span class="value">' + mergedInf.comparative + '</span></span>');
                        if (mergedInf.superlative && (isAdj || isAdv)) items.push('<span class="inflection-item" onclick="window.speakWord(\'' + mergedInf.superlative.replace(/'/g, "\\'") + '\')" style="cursor:pointer;"><span class="label">最高级</span><span class="value">' + mergedInf.superlative + '</span></span>');
                        return items.length ? '<div class="inflections-section"><div class="section-title">🔄 词形变化</div><div class="inflections-grid">' + items.join('') + '</div></div>' : '';
                    })() +
                    // 优先使用 meanings 数组渲染多含义多例句，否则回退到旧的 example_sentence
                    (function() {
                        var examplesHtml = '';
                        // 新格式：meanings 数组
                        if (r.meanings && Array.isArray(r.meanings) && r.meanings.length > 0) {
                            examplesHtml = r.meanings.map(function(m, idx) {
                                var meaningText = m.meaning || '';
                                var exampleText = m.example || '';
                                var exampleForSpeak = exampleText.replace(/[（(].*?[）)]/g, '').trim();
                                return '<div class="meaning-example-item" style="margin-bottom:0.75rem;' + (idx < r.meanings.length - 1 ? 'border-bottom:1px dashed var(--border);padding-bottom:0.75rem;' : '') + '">' +
                                    '<div style="font-weight:600;color:var(--text);margin-bottom:0.3rem;font-size:0.9rem;">' + meaningText + '</div>' +
                                    (exampleText ? '<div class="example-section" style="margin-bottom:0;border-left-color:var(--success);cursor:pointer;" onclick="window.speakWord(\'' + exampleForSpeak.replace(/'/g, "\\'") + '\')" title="点击朗读">' +
                                        '<div class="section-content" style="font-style:italic;font-size:0.85rem;">' + exampleText + ' 🔊</div>' +
                                    '</div>' : '') +
                                '</div>';
                            }).join('');
                        }
                        // 旧格式：单一的 example_sentence
                        else if (r.example_sentence) {
                            examplesHtml = '<div class="example-section" style="margin-bottom:0;border-left-color:var(--success);cursor:pointer;" onclick="window.speakWord(\'' + r.example_sentence.replace(/'/g, "\\'").replace(/[（(].*?[）)]/g, '').trim() + '\')" title="点击朗读">' +
                                '<div class="section-content" style="font-style:italic;">' + r.example_sentence + ' 🔊</div>' +
                            '</div>';
                        }
                        return examplesHtml ? '<div class="foldable-section">' +
                            '<div class="foldable-header" onclick="window.toggleFold(this)">' +
                                '<span class="fold-icon collapsed">▼</span>' +
                                '<span class="fold-title">📝 例句</span>' +
                            '</div>' +
                            '<div class="foldable-body collapsed">' +
                                examplesHtml +
                            '</div>' +
                        '</div>' : '';
                    })() +
                    (r.collocations && r.collocations.length ? '<div class="foldable-section">' +
                        '<div class="foldable-header" onclick="window.toggleFold(this)">' +
                            '<span class="fold-icon collapsed">▼</span>' +
                            '<span class="fold-title">🔗 常用搭配</span>' +
                        '</div>' +
                        '<div class="foldable-body collapsed">' +
                            '<div class="collocations-section" style="margin-bottom:0;">' +
                                r.collocations.map(function(c) {
                                    var text = typeof c === 'string' ? c : (c.text || '');
                                    var ph = typeof c === 'string' ? '' : (c.phonetic || '');
                                    var wordForSpeak = text.replace(/[（(].*[）)]/g, '').trim() || text;
                                    var phHtml = ph ? ' <span class="word-phonetic" onclick="event.stopPropagation();window.speakWord(\'' + wordForSpeak.replace(/'/g, "\\'") + '\')">' + ph + '</span>' : '';
                                    return '<span class="collocation-tag" onclick="window.speakWord(\'' + wordForSpeak.replace(/'/g, "\\'") + '\')">' + text + phHtml + '</span>';
                                }).join('') +
                            '</div>' +
                        '</div>' +
                    '</div>' : '') +
                    (r.synonyms && r.synonyms.length ? '<div class="foldable-section">' +
                        '<div class="foldable-header" onclick="window.toggleFold(this)">' +
                            '<span class="fold-icon collapsed">▼</span>' +
                            '<span class="fold-title">🔄 同义词</span>' +
                        '</div>' +
                        '<div class="foldable-body collapsed">' +
                            '<div style="padding:0.5rem 0;display:flex;flex-wrap:wrap;gap:0.5rem;">' +
                                r.synonyms.map(function(s) {
                                    var word = typeof s === 'string' ? s : (s.word || '');
                                    var ph = typeof s === 'string' ? '' : (s.phonetic || '');
                                    var meaning = typeof s === 'string' ? '' : (s.meaning || '');
                                    var phHtml = ph ? ' <span class="word-phonetic" onclick="event.stopPropagation();window.speakWord(\'' + word.replace(/'/g, "\\'") + '\')">' + ph + '</span>' : '';
                                    var meaningHtml = meaning ? ' <span style="font-size:0.7rem;color:var(--text-muted);">' + meaning + '</span>' : ' <span style="font-size:0.7rem;color:var(--text-muted);opacity:0.5;">暂无释义</span>';
                                    return '<span class="collocation-tag" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;cursor:pointer;" onclick="window.speakWord(\'' + word.replace(/'/g, "\\'") + '\')">' + word + phHtml + meaningHtml + '</span>';
                                }).join('') +
                            '</div>' +
                        '</div>' +
                    '</div>' : '') +
                    (r.antonyms && r.antonyms.length ? '<div class="foldable-section">' +
                        '<div class="foldable-header" onclick="window.toggleFold(this)">' +
                            '<span class="fold-icon collapsed">▼</span>' +
                            '<span class="fold-title">✖️ 反义词</span>' +
                        '</div>' +
                        '<div class="foldable-body collapsed">' +
                            '<div style="padding:0.5rem 0;display:flex;flex-wrap:wrap;gap:0.5rem;">' +
                                r.antonyms.map(function(a) {
                                    var word = typeof a === 'string' ? a : (a.word || '');
                                    var ph = typeof a === 'string' ? '' : (a.phonetic || '');
                                    var meaning = typeof a === 'string' ? '' : (a.meaning || '');
                                    var phHtml = ph ? ' <span class="word-phonetic" onclick="event.stopPropagation();window.speakWord(\'' + word.replace(/'/g, "\\'") + '\')">' + ph + '</span>' : '';
                                    var meaningHtml = meaning ? ' <span style="font-size:0.7rem;color:var(--text-muted);">' + meaning + '</span>' : ' <span style="font-size:0.7rem;color:var(--text-muted);opacity:0.5;">暂无释义</span>';
                                    return '<span class="collocation-tag" style="background:linear-gradient(135deg,#fce7f3,#fbcfe8);color:#9d174d;cursor:pointer;" onclick="window.speakWord(\'' + word.replace(/'/g, "\\'") + '\')">' + word + phHtml + meaningHtml + '</span>';
                                }).join('') +
                            '</div>' +
                        '</div>' +
                    '</div>' : '') +
                    (r.etymology ? (function(ety) {
                        var text = typeof ety === 'string' ? ety : (ety.origin || ety.story || '');
                        var parts = text.split('|').map(function(s) { return s.trim(); });
                        var html = '';
                        if (parts.length >= 3) {
                            html = '<div class="section-content"><div>' + parts[0] + '</div><div style="margin-top:0.3rem;">' + parts[1] + '</div><div style="margin-top:0.3rem;font-style:italic;font-size:0.85rem;color:var(--text-muted);">💬 ' + parts[2] + '</div></div>';
                        } else if (parts.length >= 2) {
                            html = '<div class="section-content"><div>' + parts[0] + '</div><div style="margin-top:0.3rem;">' + parts[1] + '</div></div>';
                        } else {
                            html = '<div class="section-content">' + text + '</div>';
                        }
                        return '<div class="etymology-section"><div class="section-title">🔍 词根解析</div>' + html + '</div>';
                    })(r.etymology) : '') +
                    (r.related_words && r.related_words.length ? '<div class="related-section"><div class="section-title">🌱 同根词</div><ul class="related-list">' + r.related_words.map(function(rw) {
                        var rwWord = rw.word || '';
                        var rwPh = rw.phonetic || '';
                        var rwPhHtml = rwPh ? ' <span class="word-phonetic" onclick="event.stopPropagation();window.speakWord(\'' + rwWord.replace(/'/g, "\\'") + '\')">' + rwPh + '</span>' : '';
                        var rwFreq = rw.frequency || '';
                        var rwFreqHtml = rwFreq ? (function(f) {
                            var colors = {'高频词': '#ef4444', '中频词': '#f59e0b', '低频词': '#10b981', '罕见词': '#94a3b8'};
                            var bgColors = {'高频词': '#fef2f2', '中频词': '#fffbeb', '低频词': '#f0fdf4', '罕见词': '#f8fafc'};
                            var color = colors[f] || '#64748b';
                            var bg = bgColors[f] || '#f1f5f9';
                            return ' <span style="font-size:0.6rem;font-weight:500;color:' + color + ';background:' + bg + ';padding:0.05rem 0.4rem;border-radius:50px;vertical-align:middle;margin-left:0.3rem;">' + f + '</span>';
                        })(rwFreq) : '';
                        return '<li ondblclick="window.handleWordAnalysis(\'' + rwWord.replace(/'/g, "\\'") + '\')" title="双击学习该同根词" style="cursor:pointer;"><span class="word" onclick="window.speakWord(\'' + rwWord.replace(/'/g, "\\'") + '\')" style="cursor:pointer;">' + rwWord + rwPhHtml + rwFreqHtml + '</span><span class="pos">' + (rw.part_of_speech || '') + '</span><span class="meaning">' + rw.meaning + '</span></li>';
                    }).join('') + '</ul></div>' : '') +
                    '<div class="cache-hint">💡 分析结果已缓存，7天内再次查看无需重新请求</div>' +
                    '<div style="margin-top:1rem;padding-top:1rem;border-top:1px dashed var(--border);">' +
                        '<div style="font-size:0.85rem;font-weight:600;margin-bottom:0.5rem;color:var(--text);display:flex;align-items:center;justify-content:space-between;">' +
                            '<span>💬 追问 AI 导师</span>' +
                            '<button class="btn-secondary btn-xs" onclick="window.clearTutorChat(\'' + word + '\')" style="font-size:0.7rem;padding:0.1rem 0.5rem;" title="清空对话历史">🗑️ 清空</button>' +
                        '</div>' +
                        '<div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.5rem;">' +
                            '<button class="btn-secondary btn-xs" onclick="window.askAITutor(\'' + word + '\', \'同根词还有哪些？\')">🔤 同根词</button>' +
                            '<button class="btn-secondary btn-xs" onclick="window.askAITutor(\'' + word + '\', \'这个词的用法？\')">📖 用法</button>' +
                            '<button class="btn-secondary btn-xs" onclick="window.askAITutor(\'' + word + '\', \'常见搭配？\')">🔗 搭配</button>' +
                            '<button class="btn-secondary btn-xs" onclick="window.askAITutor(\'' + word + '\', \'造句示例？\')">✏️ 造句</button>' +
                            '<button class="btn-secondary btn-xs" onclick="window.askAITutor(\'' + word + '\', \'下一个\')">⏭️ 下一个</button>' +
                        '</div>' +
                        '<div style="display:flex;gap:0.5rem;">' +
                            '<input id="chatInput_' + word + '" style="flex:1;padding:0.5rem 0.8rem;border-radius:var(--radius);border:1.5px solid var(--border);font-size:0.85rem;font-family:var(--font);background:white;" placeholder="输入你的问题..." onkeydown="if(event.key===\'Enter\')window.askAITutorFromInput(\'' + word + '\')">' +
                            '<button class="btn-primary btn-sm" onclick="window.askAITutorFromInput(\'' + word + '\')" style="white-space:nowrap;">发送</button>' +
                        '</div>' +
                        '<div id="chatResponse_' + word + '" style="margin-top:0.5rem;font-size:0.85rem;color:var(--text);background:var(--gray-50);border-radius:var(--radius);padding:0.75rem;display:none;line-height:1.6;max-height:120px;overflow-y:auto;"></div>' +
                    '</div>' +
                '</div>';
            // 不渲染结果到页面，保存到变量中，等用户点击提示条后再渲染
            // 记录查词历史
            addHistory(word);
            // 使用 Map 存储每个单词的 pending 数据，避免快速点击多个单词时变量覆盖
            if (!window._pendingAnalysisMap) window._pendingAnalysisMap = {};
            window._pendingAnalysisMap[word] = {word: word, html: html};


            // 分析完成后在页面右侧显示浮动提示卡片（小尺寸，不遮挡页面）
            var notifyId = 'analysisNotify_' + word.replace(/[^a-zA-Z-]/g, '');
            // 如果已存在同单词的提示条，先移除旧的
            var oldBar = document.getElementById(notifyId);
            if (oldBar) oldBar.remove();
            // 创建容器（如果不存在）
            var notifyContainer = document.getElementById('notifyContainer');
            if (!notifyContainer) {
                notifyContainer = document.createElement('div');
                notifyContainer.id = 'notifyContainer';
                notifyContainer.style.cssText = 'position:fixed;right:1rem;top:50%;transform:translateY(-50%);z-index:9999;display:flex;flex-direction:column;gap:0.4rem;max-height:80vh;overflow-y:auto;padding:0.5rem 0;scrollbar-width:thin;';
                document.body.appendChild(notifyContainer);
            }
            // 获取词性用于显示
            var posLabel = r.part_of_speech || '';
            var notifyBar = document.createElement('div');
            notifyBar.id = notifyId;
            notifyBar.style.cssText = 'pointer-events:auto;width:200px;padding:0.5rem 0.8rem;background:white;color:var(--text);border-radius:10px;cursor:pointer;animation:fadeInRight 0.3s ease;box-shadow:0 4px 16px rgba(0,0,0,0.12);font-size:0.85rem;display:flex;align-items:center;gap:0.4rem;border-left:3px solid var(--primary);transition:all 0.2s ease;';
            notifyBar.onmouseenter = function() { this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.18)'; this.style.transform = 'translateX(-2px)'; };
            notifyBar.onmouseleave = function() { this.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; this.style.transform = 'none'; };
            notifyBar.innerHTML = '<span style="font-size:0.9rem;">✅</span><span style="font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + word + '</span>' + (posLabel ? '<span style="font-size:0.65rem;color:var(--text-light);background:var(--gray-100);padding:0.05rem 0.4rem;border-radius:4px;">' + posLabel + '</span>' : '') + '<span style="font-size:0.6rem;color:var(--text-light);margin-left:auto;cursor:pointer;background:var(--gray-100);border-radius:50%;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;" onclick="event.stopPropagation();this.parentElement.remove()">✕</span>';
            // 使用闭包保存当前单词，确保点击时显示正确的分析结果
            (function(currentWord) {
                notifyBar.onclick = function() {
                    var data = window._pendingAnalysisMap[currentWord];
                    if (data) {
                        analysisResult.style.display = 'block';
                        analysisResult.innerHTML = data.html;
                    }
                    notifyBar.remove();
                    setTimeout(function() {
                        analysisResult.scrollIntoView({behavior: 'smooth', block: 'start'});
                    }, 50);
                };
            })(word);
            notifyContainer.appendChild(notifyBar);





        } catch(e) {
            analysisResult.innerHTML = '<div class="error-message">❌ ' + e.message + ' <button class="btn-secondary btn-sm" onclick="window.handleWordAnalysis(\'' + word + '\')">重试</button></div>';
        }
    }

    // ===== 查词历史记录 =====
    function getHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_PREFIX + 'list') || '[]'); } catch(e) { return []; }
    }
    function saveHistory(list) {
        try { localStorage.setItem(HISTORY_PREFIX + 'list', JSON.stringify(list)); } catch(e) {}
    }
    function addHistory(word) {
        var list = getHistory();
        // 去重：如果已存在，移到最前面
        var idx = list.indexOf(word);
        if (idx !== -1) list.splice(idx, 1);
        list.unshift(word);
        // 限制数量
        if (list.length > HISTORY_MAX) list = list.slice(0, HISTORY_MAX);
        saveHistory(list);
        renderHistory();
    }
    function clearHistory() {
        if (!confirm('清空所有查词历史？')) return;
        saveHistory([]);
        renderHistory();
        toast('已清空查词历史', 'success');
    }
    function renderHistory() {
        var section = document.getElementById('historySection');
        var list = document.getElementById('historyList');
        var count = document.getElementById('historyCount');
        if (!section || !list) return;
        var history = getHistory();
        if (history.length === 0) {
            section.style.display = 'none';
            return;
        }
        section.style.display = 'block';
        if (count) count.textContent = '(' + history.length + ')';
        list.innerHTML = history.map(function(word) {
            var cached = getCached(word);
            var pos = cached ? (cached.part_of_speech || '') : '';
            var posHtml = pos ? ' <span class="history-pos">' + pos + '</span>' : '';
            return '<span class="history-tag" onclick="window.handleWordAnalysis(\'' + word + '\')" title="点击重新查看">' + word + posHtml + '</span>';
        }).join('');
        // 默认折叠
        var body = document.getElementById('historyBody');
        var icon = document.getElementById('historyFoldIcon');
        if (body && !body.classList.contains('collapsed')) {
            body.classList.add('collapsed');
            if (icon) icon.style.transform = 'rotate(-90deg)';
        }
    }


    // 查词历史折叠切换
    window.toggleHistory = function() {
        var body = document.getElementById('historyBody');
        var icon = document.getElementById('historyFoldIcon');
        if (!body || !icon) return;
        var isCollapsed = body.classList.toggle('collapsed');
        icon.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
    };

    // 绑定清空历史按钮
    var clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.onclick = clearHistory;
    }


    // ===== 复制分析结果 =====
    window.copyAnalysis = function(word) {

        const cached = getCached(word);
        if (!cached) { toast('请先分析该单词', 'warning'); return; }
        function extractText(arr) {
            if (!arr || !arr.length) return '';
            return arr.map(function(item) {
                if (typeof item === 'string') return item;
                return item.text || item.word || '';
            }).join(', ');
        }
        const text = '单词: ' + word + '\n' +
            '音标: ' + (cached.phonetic || '') + '\n' +
            '释义: ' + (cached.meaning || '') + '\n' +
            '词根: ' + (cached.root || '') + ' - ' + (cached.root_meaning || '') + '\n' +
            (cached.prefix ? '前缀: ' + cached.prefix + ' - ' + (cached.prefix_meaning || '') + '\n' : '') +
            (cached.suffix ? '后缀: ' + cached.suffix + ' - ' + (cached.suffix_meaning || '') + '\n' : '') +
            '词源: ' + (cached.etymology || '') + '\n' +
            '例句: ' + (cached.example_sentence || '') + '\n' +
            '搭配: ' + extractText(cached.collocations) + '\n' +
            '同义词: ' + extractText(cached.synonyms) + '\n' +
            '反义词: ' + extractText(cached.antonyms);
        navigator.clipboard.writeText(text).then(() => toast('已复制到剪贴板', 'success')).catch(() => toast('复制失败', 'error'));
    };

    // ===== 复习面板 =====
    function formatNextReview(card) {
        if (card.phase === 'ebb') {
            const step = card.ebbStep || 0;
            return EBB_LABELS[step] || '20 分钟后';
        } else {
            const d = new Date(card.nextReview);
            const month = d.getMonth() + 1;
            const day = d.getDate();
            const hour = d.getHours().toString().padStart(2, '0');
            const min = d.getMinutes().toString().padStart(2, '0');
            return month + '月' + day + '日 ' + hour + ':' + min;
        }
    }

    // 渲染单词列表（根据当前 Tab）
    function renderReviewList() {
        const container = document.getElementById('reviewWordsContainer');
        if (!container) return;

        const data = getSM2Data();
        const allWords = Object.keys(data);
        const due = getDueWords();
        const activeTab = reviewPanelState.activeTab;

        // 更新 Tab 徽章
        const dueBadge = document.getElementById('tabDueBadge');
        const allBadge = document.getElementById('tabAllBadge');
        if (dueBadge) dueBadge.textContent = due.length;
        if (allBadge) allBadge.textContent = allWords.length;

        // 更新 Tab 激活状态
        document.querySelectorAll('.review-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === activeTab);
        });

        // 获取要显示的单词列表
        let wordsToShow;
        if (activeTab === 'due') {
            wordsToShow = due;
        } else {
            wordsToShow = allWords.sort((a, b) => data[a].nextReview - data[b].nextReview);
        }

        if (!wordsToShow.length) {
            container.innerHTML = '<div class="review-empty">🎉 ' + (activeTab === 'due' ? '暂无需要复习的单词' : '还没有加入任何单词') + '</div>';
            return;
        }

        container.innerHTML = wordsToShow.map(word => {
            const card = data[word];
            if (!card) return '';
            const phase = card.phase || 'sm2';
            const ebbStep = card.ebbStep || 0;
            const nextReviewStr = formatNextReview(card);
            const isDue = card.nextReview <= Date.now();

            let phaseLabel = '';
            if (phase === 'ebb') {
                const stepLabels = ['第1次', '第2次', '第3次'];
                phaseLabel = '<span style="font-size:0.65rem;background:#fef3c7;color:#92400e;padding:0.1rem 0.5rem;border-radius:50px;margin-left:0.5rem;">艾宾浩斯 ' + (stepLabels[ebbStep] || '') + '</span>';
            } else {
                phaseLabel = '<span style="font-size:0.65rem;background:#d1fae5;color:#065f46;padding:0.1rem 0.5rem;border-radius:50px;margin-left:0.5rem;">SM-2 智能</span>';
            }

            const dueIndicator = isDue ? '<span style="font-size:0.65rem;color:#ef4444;margin-left:0.3rem;">🔴 到期</span>' : '';

            const editBtn = '<button class="btn-secondary btn-xs" onclick="window.editReviewWord(\'' + word + '\')" style="color:#6366f1;border-color:#c7d2fe;" title="修改单词">✏️</button>';
            const deleteBtn = '<button class="btn-secondary btn-xs" onclick="window.deleteReviewWord(\'' + word + '\')" style="color:#ef4444;border-color:#fecaca;" title="从复习中删除">🗑️</button>';
            return '<div class="review-item" data-word="' + word + '">' +
                '<div style="display:flex;flex-direction:column;gap:0.15rem;flex:1;min-width:0;">' +
                    '<span class="word" onclick="window.handleWordAnalysis(\'' + word + '\')">' + word + phaseLabel + dueIndicator + '</span>' +
                    '<span style="font-size:0.7rem;color:var(--gray-400);">⏰ 下次复习：' + nextReviewStr + '</span>' +
                '</div>' +
                '<div class="btn-group">' +
                    editBtn +
                    deleteBtn +
                    '<button class="btn-secondary btn-xs" onclick="window.handleReviewWord(\'' + word + '\', 1)">🔴 困难</button>' +
                    '<button class="btn-secondary btn-xs" onclick="window.handleReviewWord(\'' + word + '\', 3)">🟡 一般</button>' +
                    '<button class="btn-secondary btn-xs" onclick="window.handleReviewWord(\'' + word + '\', 4)">🟢 简单</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    // 处理评分（局部更新，不刷新整个面板）
    window.handleReviewWord = function(word, quality) {
        reviewWordSM2(word, quality);
        updateStatsPanel();
        renderReviewList();
        updateDueCount();
    };

    // 打开复习面板
    function openReviewPanel() {
        reviewPanelState.isOpen = true;
        saveReviewPanelState();
        updateStatsPanel();
        renderReviewList();
        reviewPanel.style.display = 'block';
    }

    // 关闭复习面板
    function closeReviewPanel() {
        reviewPanelState.isOpen = false;
        saveReviewPanelState();
        reviewPanel.style.display = 'none';
    }

    // 切换 Tab
    function switchReviewTab(tab) {
        reviewPanelState.activeTab = tab;
        saveReviewPanelState();
        renderReviewList();
    }

    // 按钮事件绑定
    reviewBtn.onclick = () => { openReviewPanel(); reviewPanel.scrollIntoView({behavior: 'smooth', block: 'start'}); };
    closeReviewBtn.onclick = () => { closeReviewPanel(); };

    // 刷新按钮
    const refreshReviewBtn = document.getElementById('refreshReviewBtn');
    if (refreshReviewBtn) {
        refreshReviewBtn.onclick = () => {
            updateStatsPanel();
            renderReviewList();
            updateDueCount();
            toast('已刷新', 'success');
        };
    }

    // Tab 切换事件
    document.querySelectorAll('.review-tab').forEach(tab => {
        tab.onclick = () => {
            switchReviewTab(tab.dataset.tab);
        };
    });

    // ===== 导出/导入复习数据按钮 =====
    const exportReviewBtn = document.getElementById('exportReviewBtn');
    const exportDropdown = document.getElementById('exportDropdown');
    const exportCsvOption = document.getElementById('exportCsvOption');
    const exportJsonOption = document.getElementById('exportJsonOption');
    const importReviewBtn = document.getElementById('importReviewBtn');
    const importReviewInput = document.getElementById('importReviewInput');

    if (exportReviewBtn && exportDropdown) {
        // 点击导出按钮展开/收起下拉菜单
        exportReviewBtn.onclick = function(e) {
            e.stopPropagation();
            var isVisible = exportDropdown.style.display === 'block';
            exportDropdown.style.display = isVisible ? 'none' : 'block';
        };
        // 点击其他地方收起下拉菜单
        document.addEventListener('click', function() {
            exportDropdown.style.display = 'none';
        });
        // 阻止下拉菜单点击事件冒泡
        exportDropdown.onclick = function(e) {
            e.stopPropagation();
        };
    }

    if (exportCsvOption) {
        exportCsvOption.onclick = function() {
            exportDropdown.style.display = 'none';
            exportReviewDataCSV();
        };
    }

    if (exportJsonOption) {
        exportJsonOption.onclick = function() {
            exportDropdown.style.display = 'none';
            exportReviewData();
        };
    }
    if (importReviewBtn) {
        importReviewBtn.onclick = () => importReviewInput.click();
    }
    if (importReviewInput) {
        importReviewInput.onchange = (e) => {
            if (e.target.files[0]) {
                importReviewData(e.target.files[0]);
                e.target.value = '';
            }
        };
    }

    // ===== 导出功能 =====
    exportCsvBtn.onclick = () => {
        const allWords = wordGroups.reduce((acc, g) => acc.concat(g.words), []);
        const analyzed = allWords.filter(w => getCached(w));
        if (!analyzed.length) { toast('没有已分析的单词可导出，请先分析单词', 'warning'); return; }

        function extractText(arr) {
            if (!arr || !arr.length) return '';
            return arr.map(function(item) {
                if (typeof item === 'string') return item;
                return item.text || item.word || '';
            }).join('; ');
        }

        let csv = '\uFEFF单词,音标,释义,词性,词根,词根含义,前缀,后缀,词源,例句,搭配,同义词,反义词\n';
        analyzed.forEach(w => {
            const cached = getCached(w);
            const row = [
                w,
                cached.phonetic || '',
                cached.meaning || '',
                cached.part_of_speech || '',
                cached.root || '',
                cached.root_meaning || '',
                cached.prefix || '',
                cached.suffix || '',
                cached.etymology || '',
                cached.example_sentence || '',
                extractText(cached.collocations),
                extractText(cached.synonyms),
                extractText(cached.antonyms)
            ].map(v => '"' + ('' + v).replace(/"/g, '""') + '"').join(',');
            csv += row + '\n';
        });
        const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'vocabulary.csv';
        a.click();
        toast('CSV 已导出（' + analyzed.length + ' 个单词）', 'success');
    };

    // 复制全部分析结果
    copyAllBtn.onclick = () => {
        const allWords = wordGroups.reduce((acc, g) => acc.concat(g.words), []);
        const analyzed = allWords.filter(w => getCached(w));
        if (!analyzed.length) { toast('没有已分析的单词可复制，请先分析单词', 'warning'); return; }
        let text = '';
        analyzed.forEach(w => {
            const cached = getCached(w);
            text += '【' + w + '】' + (cached.phonetic ? ' [' + cached.phonetic + ']' : '') + '\n';
            text += '释义: ' + (cached.meaning || '') + '\n';
            text += '词根: ' + (cached.root || '') + ' - ' + (cached.root_meaning || '') + '\n';
            if (cached.prefix) text += '前缀: ' + cached.prefix + ' - ' + (cached.prefix_meaning || '') + '\n';
            if (cached.suffix) text += '后缀: ' + cached.suffix + ' - ' + (cached.suffix_meaning || '') + '\n';
            if (cached.etymology) text += '词源: ' + cached.etymology + '\n';
            if (cached.example_sentence) text += '例句: ' + cached.example_sentence + '\n';
            if (cached.collocations && cached.collocations.length) text += '搭配: ' + cached.collocations.join(', ') + '\n';
            text += '---\n';
        });
        navigator.clipboard.writeText(text).then(() => toast('已复制全部结果到剪贴板', 'success')).catch(() => toast('复制失败', 'error'));
    };

    // ===== 编辑 OCR 原始文本（模态框） =====
    const editOcrBtn = document.getElementById('editOcrBtn');
    const ocrEditModal = document.getElementById('ocrEditModal');
    const ocrEditText = document.getElementById('ocrEditText');
    const ocrEditCloseBtn = document.getElementById('ocrEditCloseBtn');
    const ocrEditCancelBtn = document.getElementById('ocrEditCancelBtn');
    const ocrEditConfirmBtn = document.getElementById('ocrEditConfirmBtn');

    if (editOcrBtn && ocrEditModal) {
        editOcrBtn.onclick = () => {
            if (!originalOcrText) {
                toast('没有可编辑的 OCR 结果，请先识别图片', 'warning');
                return;
            }
            ocrEditText.value = originalOcrText;
            ocrEditModal.style.display = 'flex';
        };

        function closeOcrEdit() {
            ocrEditModal.style.display = 'none';
        }

        if (ocrEditCloseBtn) ocrEditCloseBtn.onclick = closeOcrEdit;
        if (ocrEditCancelBtn) ocrEditCancelBtn.onclick = closeOcrEdit;

        if (ocrEditConfirmBtn) {
            ocrEditConfirmBtn.onclick = () => {
                const newText = ocrEditText.value.trim();
                if (!newText) { toast('文本不能为空', 'warning'); return; }
                if (newText === originalOcrText) { closeOcrEdit(); toast('文本未修改', 'warning'); return; }
                originalOcrText = newText;
                closeOcrEdit();
                extractWordsByAI(originalOcrText).then(groups => {
                    wordGroups = groups;
                    renderWords(groups);
                    toast('✅ 已重新提取单词', 'success');
                }).catch(err => {
                    toast('❌ 提取失败：' + err.message, 'error');
                });
            };
        }
    }

    // ===== 图片预处理（灰度 + 对比度拉伸 + 锐化） =====
    function preprocessImage(img, targetW) {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > targetW) { h *= targetW / w; w = targetW; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // 1. 转灰度
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = data[i + 1] = data[i + 2] = gray;
        }

        // 2. 分析图片质量
        let sum = 0, sumSq = 0;
        for (let i = 0; i < data.length; i += 4) {
            sum += data[i];
            sumSq += data[i] * data[i];
        }
        const n = data.length / 4;
        const mean = sum / n;
        const stdDev = Math.sqrt(sumSq / n - mean * mean);
        const isLowContrast = stdDev < 40;

        // 3. 对比度拉伸
        let grayMin = 255, grayMax = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] < grayMin) grayMin = data[i];
            if (data[i] > grayMax) grayMax = data[i];
        }
        const grayRange = grayMax - grayMin;
        if (grayRange > 10) {
            if (isLowContrast) {
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = (data[i] - grayMin) / grayRange * 255;
                    data[i + 1] = data[i];
                    data[i + 2] = data[i];
                }
            } else {
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = 10 + (data[i] - grayMin) / grayRange * 235;
                    data[i + 1] = data[i];
                    data[i + 2] = data[i];
                }
            }
        }

        // 4. 锐化
        const sharpenAmount = 0.2;
        const sharpSrc = new Uint8ClampedArray(data);
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = (y * w + x) * 4;
                const sum = -sharpSrc[((y-1)*w + x-1)*4] - sharpSrc[((y-1)*w + x)*4] - sharpSrc[((y-1)*w + x+1)*4]
                           - sharpSrc[(y*w + x-1)*4] + 9 * sharpSrc[idx] - sharpSrc[(y*w + x+1)*4]
                           - sharpSrc[((y+1)*w + x-1)*4] - sharpSrc[((y+1)*w + x)*4] - sharpSrc[((y+1)*w + x+1)*4];
                data[idx] = sharpSrc[idx] + sharpenAmount * (sum - sharpSrc[idx]);
                data[idx+1] = data[idx];
                data[idx+2] = data[idx];
            }
        }

        // 5. 自适应二值化（Otsu 阈值法）- 仅对低对比度图片启用
        if (isLowContrast) {
            // 计算直方图
            var hist = new Array(256).fill(0);
            for (var i = 0; i < data.length; i += 4) {
                hist[Math.round(data[i])]++;
            }
            // Otsu 阈值计算
            var total = data.length / 4;
            var sumTotal = 0;
            for (var t = 0; t < 256; t++) sumTotal += t * hist[t];
            var sumB = 0, wB = 0, wF = 0;
            var maxVariance = 0, threshold = 0;
            for (var t = 0; t < 256; t++) {
                wB += hist[t];
                if (wB === 0) continue;
                wF = total - wB;
                if (wF === 0) break;
                sumB += t * hist[t];
                var meanB = sumB / wB;
                var meanF = (sumTotal - sumB) / wF;
                var betweenVar = wB * wF * (meanB - meanF) * (meanB - meanF);
                if (betweenVar > maxVariance) {
                    maxVariance = betweenVar;
                    threshold = t;
                }
            }
            // 应用二值化
            for (var i = 0; i < data.length; i += 4) {
                var val = data[i] >= threshold ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = val;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;

    }

    function compressImage(file, maxW) {
        if (maxW === undefined) maxW = 1500;


        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = preprocessImage(img, maxW);
                    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95);
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function handleImage(file) {
        if (!file.type.startsWith('image/')) return;
        compressImage(file).then(blob => {
            currentImageFile = new File([blob], file.name, {type: 'image/jpeg'});
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadPreview.src = e.target.result;
                uploadPreview.style.display = 'block';
                uploadPlaceholder.classList.add('hidden');
                uploadArea.classList.add('has-image');
                recognizeBtn.disabled = false;
                // 显示裁剪提示和按钮
                var hint = document.querySelector('.re-select-hint');
                if (hint) hint.style.display = 'block';
            };
            reader.readAsDataURL(currentImageFile);
            wordCloud.innerHTML = '<p class="placeholder-text">📌 图片已加载，点击"识别英文单词"</p>';
            wordResults.style.display = 'none';
            wordResults.innerHTML = '';
            analysisResult.style.display = 'none';
        });
    }

    uploadArea.onclick = () => imageInput.click();
    imageInput.onchange = () => { if (imageInput.files[0]) handleImage(imageInput.files[0]); };
    uploadArea.ondragover = e => { e.preventDefault(); uploadArea.classList.add('drag-over'); };
    uploadArea.ondragleave = () => uploadArea.classList.remove('drag-over');
    uploadArea.ondrop = e => { e.preventDefault(); uploadArea.classList.remove('drag-over'); if (e.dataTransfer.files[0]) handleImage(e.dataTransfer.files[0]); };
    document.onpaste = (e) => {
        if (isTextMode) return;
        const item = e.clipboardData && e.clipboardData.items && e.clipboardData.items[0];
        if (item && item.type.startsWith('image/')) {
            e.preventDefault();
            handleImage(item.getAsFile());
        }
    };

    // ===== 裁剪按钮 =====
    var cropBtn = document.getElementById('cropBtn');
    if (cropBtn) {
        cropBtn.onclick = function(e) {
            e.stopPropagation();
            if (!currentImageFile) return;
            var reader = new FileReader();
            reader.onload = function(e) {
                cropImage.src = e.target.result;
                cropModal.style.display = 'flex';
                if (cropper) cropper.destroy();
                cropper = new Cropper(cropImage, {viewMode: 1, autoCropArea: 0.9, rotatable: true});
            };
            reader.readAsDataURL(currentImageFile);
        };
    }

    // ===== 重新上传按钮 =====
    var reUploadBtn = document.getElementById('reUploadBtn');
    if (reUploadBtn) {
        reUploadBtn.onclick = function(e) {
            e.stopPropagation();
            // 先清除当前图片状态
            uploadPreview.style.display = 'none';
            uploadPreview.src = '';
            uploadPlaceholder.classList.remove('hidden');
            uploadArea.classList.remove('has-image');
            currentImageFile = null;
            recognizeBtn.disabled = true;
            wordCloud.style.display = 'block';
            wordCloud.innerHTML = '<p class="placeholder-text">✨ 等待上传图片，单词将显示在这里</p>';
            wordResults.style.display = 'none';
            wordResults.innerHTML = '';
            analysisResult.style.display = 'none';
            wordGroups = [];
            wordEditArea.style.display = 'none';
            var hint = document.querySelector('.re-select-hint');
            if (hint) hint.style.display = 'none';
            // 触发文件选择
            imageInput.click();
        };
    }

    // ===== 裁剪 =====
    uploadPreview.onclick = (e) => {
        e.stopPropagation();
        if (!currentImageFile) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            cropImage.src = e.target.result;
            cropModal.style.display = 'flex';
            if (cropper) cropper.destroy();
            cropper = new Cropper(cropImage, {viewMode: 1, autoCropArea: 0.9, rotatable: true});
        };
        reader.readAsDataURL(currentImageFile);
    };
    cropCloseBtn.onclick = cropCancelBtn.onclick = () => {
        if (cropper) { cropper.destroy(); cropper = null; }
        cropModal.style.display = 'none';
    };
    rotateLeftBtn.onclick = () => {
        if (cropper) {
            cropper.rotate(-90);
            // 旋转后重新居中
            var canvasData = cropper.getCanvasData();
            cropper.setCanvasData({ left: 0, top: 0 });
        }
    };
    rotateRightBtn.onclick = () => {
        if (cropper) {
            cropper.rotate(90);
            // 旋转后重新居中
            var canvasData = cropper.getCanvasData();
            cropper.setCanvasData({ left: 0, top: 0 });
        }
    };
    cropConfirmBtn.onclick = () => {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas({maxWidth: 2048});
        canvas.toBlob(blob => {
            currentImageFile = new File([blob], 'cropped.jpg', {type: 'image/jpeg'});
            uploadPreview.src = URL.createObjectURL(blob);
            cropper.destroy(); cropper = null;
            cropModal.style.display = 'none';
        }, 'image/jpeg', 0.92);
    };

    // ===== 识别 =====
    // 识别完成后显示"查看结果"按钮，点击后才渲染单词列表，避免页面跳转
    var showResultsBtn = null;

    recognizeBtn.onclick = async () => {
        if (!currentImageFile) return;
        recognizeBtn.disabled = true;
        wordCloud.innerHTML = '<div style="text-align:center;padding:1.5rem;">' +
            '<div style="font-size:2rem;margin-bottom:0.5rem;">🔍</div>' +
            '<div style="font-size:1rem;font-weight:600;color:var(--text);margin-bottom:0.5rem;">OCR 识别中...</div>' +
            '<div style="width:80%;max-width:300px;margin:0 auto;background:var(--gray-200);border-radius:50px;height:8px;overflow:hidden;">' +
            '<div id="cloudProgressFill" style="height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:50px;width:0%;transition:width 0.3s ease;"></div></div>' +
            '<div id="cloudProgressText" style="font-size:0.8rem;color:var(--text-light);margin-top:0.5rem;">0%</div>' +
            '</div>';
        try {
            const {data: {text}} = await Tesseract.recognize(currentImageFile, 'eng', {
                logger: info => {
                    if (info.status === 'recognizing text') {
                        const pct = Math.round(info.progress * 100);
                        var cloudFill = document.getElementById('cloudProgressFill');
                        var cloudText = document.getElementById('cloudProgressText');
                        if (cloudFill) cloudFill.style.width = pct + '%';
                        if (cloudText) cloudText.textContent = pct + '%';
                    }
                }
            });
            if (!text.trim()) { toast('未识别到文字', 'warning'); return; }
            originalOcrText = text;
            // AI 纠错阶段
            wordCloud.innerHTML = '<div style="text-align:center;padding:1.5rem;">' +
                '<div style="font-size:2rem;margin-bottom:0.5rem;">🤖</div>' +
                '<div style="font-size:1rem;font-weight:600;color:var(--text);margin-bottom:0.5rem;">AI 纠错 + 提取单词中...</div>' +
                '<div style="font-size:0.8rem;color:var(--text-light);"><span class="loading-spinner"></span></div>' +
                '</div>';
            wordGroups = await extractWordsByAI(text);
            var totalWords = wordGroups.reduce(function(acc, g) { return acc + (g.words ? g.words.length : 0); }, 0);
            if (totalWords) toast('识别到 ' + totalWords + ' 个单词', 'success');
            // 不渲染单词，显示"查看结果"按钮
            wordCloud.innerHTML = '<div style="text-align:center;padding:1.5rem;">' +
                '<div style="font-size:2rem;margin-bottom:0.5rem;">✅</div>' +
                '<div style="font-size:1rem;font-weight:600;color:var(--text);margin-bottom:0.5rem;">识别完成，共 ' + totalWords + ' 个单词</div>' +
                '<button id="showResultsBtn" class="btn-primary" style="margin:0 auto;">📋 查看单词列表</button>' +
                '</div>';
            showResultsBtn = document.getElementById('showResultsBtn');
            if (showResultsBtn) {
                showResultsBtn.onclick = function() {
                    renderWords(wordGroups);
                    wordCloud.style.display = 'none';
                    showResultsBtn = null;
                };
            }
        } catch(e) { toast('识别失败: ' + e.message, 'error'); }
        finally { recognizeBtn.disabled = false; }
    };

    // ===== 文本分析 =====
    analyzeTextBtn.onclick = async () => {
        const text = englishText.value.trim();
        if (!text) return;
        analyzeTextBtn.disabled = true;
        try {
            wordGroups = await extractWordsByAI(text);
            renderWords(wordGroups);
            if (wordGroups.length) toast('提取到 ' + wordGroups.length + ' 个单词', 'success');
        } catch(e) { toast('提取失败: ' + e.message, 'error'); }
        finally { analyzeTextBtn.disabled = false; }
    };

    // ===== 切换模式 =====
    switchInputBtn.onclick = () => {
        isTextMode = !isTextMode;
        textInputArea.style.display = isTextMode ? 'block' : 'none';
        uploadArea.style.display = isTextMode ? 'none' : 'block';
        recognizeBtn.style.display = isTextMode ? 'none' : 'inline-flex';
        // 文本模式下也显示复习按钮（文本提取的单词可以加入复习）
        reviewBtn.style.display = Object.keys(getSM2Data()).length > 0 ? 'inline-flex' : 'none';
        switchInputBtn.textContent = isTextMode ? '📸 切换到拍照' : '📋 切换到粘贴文本';
        // 文本模式下隐藏 wordCloud 占位
        if (isTextMode) {
            wordCloud.style.display = 'none';
        } else {
            wordCloud.style.display = 'block';
        }
    };

    clearAllWordsBtn.onclick = () => {
        if (confirm('清空所有单词？')) { wordGroups = []; renderWords([]); analysisResult.style.display = 'none'; }
    };

    // ===== 折叠面板切换 =====
    window.toggleFold = function(header) {
        const body = header.nextElementSibling;
        const icon = header.querySelector('.fold-icon');
        if (body && icon) {
            body.classList.toggle('collapsed');
            icon.classList.toggle('collapsed');
        }
    };

    // ===== 导出复习数据（CSV 格式，含完整 AI 分析） =====
    function exportReviewDataCSV() {
        const data = getSM2Data();
        const words = Object.keys(data);
        if (!words.length) { toast('没有复习数据可导出', 'warning'); return; }

        function extractText(arr) {
            if (!arr || !arr.length) return '';
            return arr.map(function(item) {
                if (typeof item === 'string') return item;
                return item.text || item.word || '';
            }).join('; ');
        }

        let csv = '\uFEFF单词,音标,释义,词性,词根,词根含义,前缀,后缀,词源,例句,搭配,同义词,反义词,学习阶段,复习次数,下次复习\n';
        words.forEach(function(word) {
            var cached = getCached(word);
            var card = data[word];
            var phase = card.phase === 'ebb' ? '艾宾浩斯' : 'SM-2';
            var nextReview = new Date(card.nextReview);
            var dateStr = nextReview.getFullYear() + '-' + (nextReview.getMonth()+1) + '-' + nextReview.getDate() + ' ' + nextReview.getHours() + ':' + nextReview.getMinutes();

            var row = [
                word,
                cached ? (cached.phonetic || '') : '',
                cached ? (cached.meaning || '') : '',
                cached ? (cached.part_of_speech || '') : '',
                cached ? (cached.root || '') : '',
                cached ? (cached.root_meaning || '') : '',
                cached ? (cached.prefix || '') : '',
                cached ? (cached.suffix || '') : '',
                cached ? (cached.etymology || '') : '',
                cached ? (cached.example_sentence || '') : '',
                cached ? extractText(cached.collocations) : '',
                cached ? extractText(cached.synonyms) : '',
                cached ? extractText(cached.antonyms) : '',
                phase,
                card.reps || 0,
                dateStr
            ].map(function(v) { return '"' + ('' + v).replace(/"/g, '""') + '"'; }).join(',');

            csv += row + '\n';
        });

        const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = 'vocab_review_' + dateStr + '.csv';
        a.click();
        URL.revokeObjectURL(a.href);
        toast('✅ CSV 已导出（' + words.length + ' 个单词）', 'success');
    }

    // ===== 导出复习数据（JSON 完整备份） =====
    function exportReviewData() {
        const data = getSM2Data();
        const words = Object.keys(data);
        if (!words.length) { toast('没有复习数据可导出', 'warning'); return; }

        // 收集所有复习相关数据
        const exportData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            sm2Data: data,
            firstDate: localStorage.getItem('sm2_first_date') || '',
            reviewLogs: {}
        };

        // 收集所有复习日志
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(REVIEW_LOG_PREFIX)) {
                try {
                    exportData.reviewLogs[key] = JSON.parse(localStorage.getItem(key));
                } catch(e) {}
            }
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = 'vocab_review_' + dateStr + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        toast('✅ 复习数据已导出（' + words.length + ' 个单词）', 'success');
    }

    // ===== 导入复习数据 =====
    function importReviewData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.sm2Data || typeof data.sm2Data !== 'object') {
                    toast('❌ 无效的备份文件', 'error');
                    return;
                }

                // 合并导入的数据到当前数据
                const currentData = getSM2Data();
                const importCount = Object.keys(data.sm2Data).length;
                let newCount = 0;

                for (const [word, card] of Object.entries(data.sm2Data)) {
                    if (!currentData[word]) {
                        currentData[word] = card;
                        newCount++;
                    }
                }
                saveSM2Data(currentData);

                // 恢复首次学习日期（取更早的那个）
                if (data.firstDate) {
                    const existing = localStorage.getItem('sm2_first_date');
                    if (!existing || parseInt(data.firstDate) < parseInt(existing)) {
                        localStorage.setItem('sm2_first_date', data.firstDate);
                    }
                }

                // 恢复复习日志
                if (data.reviewLogs) {
                    for (const [key, logs] of Object.entries(data.reviewLogs)) {
                        if (Array.isArray(logs)) {
                            const existing = JSON.parse(localStorage.getItem(key) || '[]');
                            const merged = [...new Set([...existing, ...logs])];
                            localStorage.setItem(key, JSON.stringify(merged));
                        }
                    }
                }

                updateStatsPanel();
                renderReviewList();
                updateDueCount();
                toast('✅ 成功导入 ' + importCount + ' 个单词（新增 ' + newCount + ' 个）', 'success');
            } catch(e) {
                toast('❌ 文件解析失败：' + e.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    // ===== 从复习中删除单词 =====
    window.deleteReviewWord = function(word) {
        if (!confirm('确定从复习中删除 "' + word + '" 吗？')) return;
        const data = getSM2Data();
        delete data[word];
        saveSM2Data(data);
        updateStatsPanel();
        renderReviewList();
        updateDueCount();
        toast('已从复习中删除 "' + word + '"', 'success');
    };

    // ===== 修改复习中的单词 =====
    window.editReviewWord = function(oldWord) {
        const newWord = prompt('修改单词 "' + oldWord + '" 为:', oldWord);
        if (!newWord || !newWord.trim() || newWord === oldWord) return;
        const clean = newWord.trim().replace(/[^a-zA-Z-]/g, '');
        if (!clean || clean.length < 2) { toast('无效的单词', 'warning'); return; }
        const data = getSM2Data();
        if (data[clean]) { toast('"' + clean + '" 已在复习列表中', 'warning'); return; }
        if (data[oldWord]) {
            data[clean] = data[oldWord];
            delete data[oldWord];
            saveSM2Data(data);
        }
        updateStatsPanel();
        renderReviewList();
        updateDueCount();
        toast('已修改为 "' + clean + '"', 'success');
    };

    // ===== 暴露全局函数 =====
    window.speakWord = speakWord;
    window.speakText = speakText;
    window.handleWordAnalysis = handleWordAnalysis;
    window.addToSM2 = addToSM2;
    window.reviewWordSM2 = reviewWordSM2;

    // ===== AI 导师追问（带对话历史） =====
    const tutorChatHistory = {};

    window.toggleCustomInput = function(word) {
        const div = document.getElementById('customInput_' + word);
        if (div) {
            div.style.display = div.style.display === 'none' ? 'block' : 'none';
            if (div.style.display === 'block') {
                const input = document.getElementById('chatInput_' + word);
                if (input) setTimeout(function() { input.focus(); }, 100);
            }
        }
    };

    window.askAITutorFromInput = function(word) {
        const input = document.getElementById('chatInput_' + word);
        if (!input) return;
        const question = input.value.trim();
        if (!question) { toast('请输入问题', 'warning'); return; }
        window.askAITutor(word, question);
    };

    window.clearTutorChat = function(word) {
        delete tutorChatHistory[word];
        localStorage.removeItem('tutorChat_' + word);
        const responseDiv = document.getElementById('chatResponse_' + word);
        if (responseDiv) {
            responseDiv.style.display = 'none';
            responseDiv.innerHTML = '';
        }
        toast('已清空对话历史', 'success');
    };

    window.askAITutor = async function(word, question) {
        const responseDiv = document.getElementById('chatResponse_' + word);
        if (!responseDiv) return;

        // 如果没有传 question，从输入框取
        if (!question) {
            const input = document.getElementById('chatInput_' + word);
            if (!input) return;
            question = input.value.trim();
            if (!question) { toast('请输入问题', 'warning'); return; }
        }

        responseDiv.style.display = 'block';

        // 在底部追加 loading，不覆盖已有对话
        const loadingEl = document.createElement('div');
        loadingEl.id = 'loading_' + word;
        loadingEl.innerHTML = '<span class="loading-spinner"></span> 思考中...';
        responseDiv.appendChild(loadingEl);
        responseDiv.scrollTop = responseDiv.scrollHeight;

        try {
            // 初始化对话历史（优先从 localStorage 恢复）
            if (!tutorChatHistory[word]) {
                const saved = localStorage.getItem('tutorChat_' + word);
                if (saved) {
                    try { tutorChatHistory[word] = JSON.parse(saved); } catch(e) {}
                }
            }
            if (!tutorChatHistory[word]) {
                const cached = getCached(word);
                const context = cached
                    ? '用户刚才查了"' + word + '"，分析结果是：\n' + JSON.stringify(cached, null, 2)
                    : '用户查了"' + word + '"';
                tutorChatHistory[word] = [
                    {role: 'system', content: '你是一位词根词缀导师。你的任务是：\n1. 用已知词根引出相关词汇，举一反三\n2. 鼓励用户思考，用提问引导而不是直接给答案\n3. 回答简洁有温度，像一位耐心的老师\n4. 回答控制在100字以内\n5. **重要：每次你向用户提问时，请在末尾加上「[提示]」标记。例如："你知道这个词根是什么意思吗？[提示]"**'},
                    {role: 'user', content: context}
                ];
            }

            // 追加用户问题
            tutorChatHistory[word].push({role: 'user', content: question});

            const data = await fetchAI({
                model: 'deepseek-chat',
                messages: tutorChatHistory[word],
                max_tokens: 500,
                temperature: 0.7
            });

            const answer = data.choices[0].message.content;
            // 保存 AI 回答到历史
            tutorChatHistory[word].push({role: 'assistant', content: answer});

            // 持久化到 localStorage
            try { localStorage.setItem('tutorChat_' + word, JSON.stringify(tutorChatHistory[word])); } catch(e) {}

            // 移除 loading 元素
            const loading = document.getElementById('loading_' + word);
            if (loading) loading.remove();

            // 重新渲染完整对话历史（显示用户问题 + AI 回答）
            const historyHtml = tutorChatHistory[word]
                .filter(function(m) { return m.role !== 'system'; })
                .map(function(m, i) {
                    // 跳过初始的 context 消息
                    if (i === 0 && m.role === 'user' && m.content.indexOf('用户刚才查了') === 0) return '';
                    if (i === 0 && m.role === 'user' && m.content.indexOf('用户查了') === 0) return '';
                    var icon = m.role === 'user' ? '🧑' : '🤖';
                    var speakBtn = '';
                    // 检测 AI 回答末尾是否有 [提示] 标记，有则在句子末尾追加"提示"按钮
                    var showNoBtn = m.role === 'assistant' && /\[提示\]\s*$/.test(m.content);
                    var contentText = m.content;
                    var noBtn = '';
                    if (showNoBtn) {
                        // 去掉 [提示] 标记，换成按钮
                        contentText = m.content.replace(/\[提示\]\s*$/, '');
                        noBtn = ' <button class="btn-secondary btn-xs" onclick="window.askAITutor(\'' + word + '\', \'我不会，请给提示\')" style="font-size:0.75rem;padding:0.1rem 0.5rem;vertical-align:middle;margin-left:0.2rem;">💡 提示</button>';
                    }
                    return '<div style="margin-bottom:0.4rem;">' + icon + ' ' + contentText + speakBtn + noBtn + '</div>';
                })
                .filter(function(h) { return h !== ''; })
                .join('');
            responseDiv.innerHTML = historyHtml;
            responseDiv.scrollTop = responseDiv.scrollHeight;

            // 清空输入框（如果有）
            const input = document.getElementById('chatInput_' + word);
            if (input) input.value = '';
        } catch(e) {
            // 移除 loading 元素
            const loading = document.getElementById('loading_' + word);
            if (loading) loading.remove();
            // 在底部追加错误信息，不覆盖已有内容
            const errEl = document.createElement('div');
            errEl.style.color = 'var(--error)';
            errEl.innerHTML = '❌ ' + e.message;
            responseDiv.appendChild(errEl);
            responseDiv.scrollTop = responseDiv.scrollHeight;
        }
    };

    // ===== "考考我" — 混合题型，每次随机出一种 =====
    window.askQuiz = async function(word) {
        const quizSection = document.getElementById('quizSection_' + word);
        if (!quizSection) return;

        // 显示 loading
        quizSection.innerHTML = '<span class="loading-spinner"></span> 出题中...';

        try {
            const cached = getCached(word);
            const analysisContext = cached
                ? '该单词的分析结果：\n' + JSON.stringify(cached, null, 2)
                : '';

            const prompt = '你是一个英语学习助手。请为单词 "' + word + '" 出一道练习题。\n\n' +
                analysisContext + '\n\n' +
                '请从以下 4 种题型中**随机选一种**出题（每次只出 1 道）：\n\n' +
                '题型1 - 看中文写单词：给出该单词的中文释义，让用户输入对应的英文单词。\n' +
                '题型2 - 同根词考察：给出该单词的词根信息，让用户从几个选项中选出同根词，或直接问用户知道哪些同根词。\n' +
                '题型3 - 用法/搭配填空：给出一个包含该单词的英文句子，但挖掉搭配的介词或关键部分，让用户填空。\n' +
                '题型4 - 句子填空：给出一个带空格的英文句子（用 ____ 表示空格），让用户填入正确的单词（可以是该单词本身，也可以是语境中合适的词）。\n\n' +
                '要求：\n' +
                '1. 只出 1 道题，不要多题\n' +
                '2. 题目要简洁明了\n' +
                '3. 在题目末尾用「[答案]」标记出正确答案，格式如：[答案]inspect\n' +
                '4. 如果用户答对了，给予表扬；如果答错了，给出正确答案和简单解释\n' +
                '5. 回复格式：先出题，用户回答后你再判断对错';

            const data = await fetchAI({
                model: 'deepseek-chat',
                messages: [
                    {role: 'system', content: '你是一位英语学习导师。每次出一道题，题目末尾用 [答案]xxx 标记正确答案。用户回答后判断对错并给出反馈。'},
                    {role: 'user', content: prompt}
                ],
                max_tokens: 500,
                temperature: 0.8
            });

            const answer = data.choices[0].message.content;

            // 移除 loading
            const loading = document.getElementById('loading_quiz_' + word);
            if (loading) loading.remove();

            // 提取答案用于判断
            const answerMatch = answer.match(/\[答案\](\S+)/);
            const correctAnswer = answerMatch ? answerMatch[1].toLowerCase().replace(/[^a-zA-Z-]/g, '') : '';

            // 渲染题目到 quizSection
            quizSection.innerHTML =
                '<div style="margin-bottom:0.4rem;">' +
                '📝 <strong>考考你：</strong><br>' +
                answer.replace(/\[答案\]\S+/, '').trim() +
                '</div>' +
                '<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">' +
                '<input id="quizInput_' + word + '" style="flex:1;padding:0.4rem 0.7rem;border-radius:var(--radius);border:1.5px solid var(--border);font-size:0.85rem;font-family:var(--font);background:white;" placeholder="输入你的答案..." onkeydown="if(event.key===\'Enter\')window.submitQuizAnswer(\'' + word + '\', \'' + correctAnswer + '\')">' +
                '<button class="btn-primary btn-sm" onclick="window.submitQuizAnswer(\'' + word + '\', \'' + correctAnswer + '\')" style="white-space:nowrap;">提交</button>' +
                '</div>' +
                '<div id="quizResult_' + word + '" style="margin-top:0.3rem;font-size:0.85rem;"></div>';

            // 聚焦输入框
            setTimeout(function() {
                const input = document.getElementById('quizInput_' + word);
                if (input) input.focus();
            }, 100);

        } catch(e) {
            quizSection.innerHTML = '<span style="color:var(--error);">❌ 出题失败：' + e.message + '</span>';
        }
    };

    window.submitQuizAnswer = function(word, correctAnswer) {
        const input = document.getElementById('quizInput_' + word);
        const resultDiv = document.getElementById('quizResult_' + word);
        if (!input || !resultDiv) return;

        const userAnswer = input.value.trim().toLowerCase().replace(/[^a-zA-Z-]/g, '');
        if (!userAnswer) { toast('请输入答案', 'warning'); return; }

        const isCorrect = correctAnswer && userAnswer === correctAnswer;

        if (isCorrect) {
            resultDiv.innerHTML = '<span style="color:var(--success);font-weight:600;">✅ 正确！🎉 太棒了！</span>';
            resultDiv.style.color = 'var(--success)';
        } else {
            resultDiv.innerHTML = '<span style="color:var(--error);font-weight:600;">❌ 答案是：<strong>' + correctAnswer + '</strong></span>';
            resultDiv.style.color = 'var(--error)';
        }

        input.disabled = true;
        input.style.opacity = '0.6';
        resultDiv.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    };

    // ===== "对比"按钮：弹出输入框让用户输入另一个词 =====
    window.askAITutorCompare = function(word) {
        const otherWord = prompt('输入要对比的单词：');
        if (otherWord && otherWord.trim()) {
            const clean = otherWord.trim().replace(/[^a-zA-Z-]/g, '');
            if (clean && clean.length >= 2) {
                window.askAITutor(word, '请对比 "' + word + '" 和 "' + clean + '"，从词根、含义、用法等方面说明它们的区别和联系');
            } else {
                toast('请输入有效的英文单词', 'warning');
            }
        }
    };

    // ===== 注册 Service Worker (PWA) =====
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(function() {});
    }

    // ===== 夜间模式切换 =====
    (function() {
        var themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            // 恢复上次选择
            var saved = localStorage.getItem('theme');
            if (saved === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                themeToggle.textContent = '☀️';
            }
            themeToggle.onclick = function() {
                var html = document.documentElement;
                var isDark = html.getAttribute('data-theme') === 'dark';
                html.setAttribute('data-theme', isDark ? 'light' : 'dark');
                localStorage.setItem('theme', isDark ? 'light' : 'dark');
                themeToggle.textContent = isDark ? '🌙' : '☀️';
            };
        }
    })();

    // ===== 隐藏页面 loading 占位 =====
    (function() {
        var loading = document.getElementById('appLoading');
        var content = document.getElementById('appContent');
        if (loading && content) {
            loading.style.display = 'none';
            content.style.display = 'block';
        }
    })();

    // ===== 首次使用数据备份提醒 =====
    (function() {
        if (!localStorage.getItem('backup_reminder_shown')) {
            var data = getSM2Data();
            var words = Object.keys(data);
            if (words.length > 0) {
                setTimeout(function() {
                    var tip = document.createElement('div');
                    tip.style.cssText = 'margin-top:1rem;padding:0.75rem 1rem;background:var(--warning-bg);border-radius:var(--radius);border-left:3px solid var(--accent);font-size:0.85rem;color:var(--text);animation:fadeInUp 0.4s ease;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;';
                    tip.innerHTML = '<span>💡 提示：学习数据保存在本地浏览器中，清除浏览器数据会丢失。建议定期 <strong>导出备份</strong>（复习面板 → 导出复习数据）</span>' +
                        '<button style="flex-shrink:0;background:transparent;border:none;color:var(--text-light);font-size:1.2rem;cursor:pointer;padding:0.2rem;" title="不再提示">✕</button>';
                    var closeBtn = tip.querySelector('button');
                    closeBtn.onclick = function() {
                        tip.remove();
                        localStorage.setItem('backup_reminder_shown', '1');
                    };
                    var container = document.querySelector('.container');
                    if (container) container.appendChild(tip);
                }, 2000);
            }
            localStorage.setItem('backup_reminder_shown', '1');
        }
    })();

    // ===== 高频词根数据 =====
    var HIGH_FREQ_ROOTS = [
        {root: 'spect', meaning: '看', scene: '安检员打开你的包仔细查看', words: ['inspect', 'respect', 'prospect', 'spectacle', 'spectator', 'retrospect']},
        {root: 'dict', meaning: '说', scene: '天气预报员提前说出明天的天气', words: ['predict', 'dictate', 'dictionary', 'contradict', 'verdict', 'edict']},
        {root: 'struct', meaning: '建造', scene: '建筑师设计图纸后开始建造大楼', words: ['construct', 'destroy', 'structure', 'instruct', 'obstruct', 'reconstruct']},
        {root: 'port', meaning: '搬运', scene: '搬运工把货物从码头搬到卡车上', words: ['transport', 'export', 'import', 'report', 'portable', 'deport']},
        {root: 'tract', meaning: '拉', scene: '拖拉机拉着沉重的货物向前行驶', words: ['attract', 'extract', 'contract', 'subtract', 'tractor', 'distract']},
        {root: 'scrib/script', meaning: '写', scene: '古代人用羽毛笔在羊皮纸上写字', words: ['describe', 'prescribe', 'subscribe', 'script', 'manuscript', 'inscribe']},
        {root: 'rupt', meaning: '打破', scene: '玻璃杯掉在地上瞬间破裂成碎片', words: ['erupt', 'interrupt', 'corrupt', 'disrupt', 'rupture', 'abrupt']},
        {root: 'pel/puls', meaning: '推', scene: '用力推秋千让它荡得更高', words: ['compel', 'expel', 'propel', 'repel', 'impulse', 'compulsory']},
        {root: 'vert/vers', meaning: '转', scene: '方向盘一转，汽车改变了方向', words: ['convert', 'diverse', 'reverse', 'version', 'advertise', 'controversy']},
        {root: 'duc/duct', meaning: '引导', scene: '导游举着小旗引导游客往前走', words: ['produce', 'reduce', 'introduce', 'conduct', 'deduce', 'induce']},
        {root: 'press', meaning: '压', scene: '用书本压住被风吹起的纸张', words: ['express', 'impress', 'compress', 'depress', 'suppress', 'oppress']},
        {root: 'form', meaning: '形状', scene: '陶艺家用双手把泥土塑造成碗的形状', words: ['reform', 'transform', 'uniform', 'inform', 'perform', 'platform']},
        {root: 'pose/pone', meaning: '放置', scene: '把花瓶稳稳地放在桌子中央', words: ['compose', 'expose', 'impose', 'propose', 'suppose', 'opponent']},
        {root: 'mit/miss', meaning: '发送', scene: '把信件投进邮筒发送出去', words: ['admit', 'commit', 'permit', 'transmit', 'mission', 'dismiss']},
        {root: 'ceed/cede', meaning: '走', scene: '沿着小路一直往前走就能到达村庄', words: ['proceed', 'succeed', 'exceed', 'concede', 'recede', 'precede']},
        {root: 'fer', meaning: '带来', scene: '快递员把包裹送到你家门口', words: ['transfer', 'refer', 'prefer', 'confer', 'infer', 'offer']},
        {root: 'voc/vok', meaning: '声音', scene: '歌手的优美声音在音乐厅里回荡', words: ['vocal', 'advocate', 'provoke', 'revoke', 'evoke', 'vocabulary']},
        {root: 'vis/vid', meaning: '看', scene: '用望远镜看远处山上的风景', words: ['vision', 'visible', 'visit', 'advise', 'revise', 'evidence']},
        {root: 'aud', meaning: '听', scene: '把耳朵贴近贝壳听海浪的声音', words: ['audio', 'audience', 'auditorium', 'audit', 'audible', 'inaudible']},
        {root: 'bene', meaning: '好', scene: '做善事会带来好的回报', words: ['benefit', 'benevolent', 'beneficial', 'benediction', 'benefactor', 'benign']},
        {root: 'mal', meaning: '坏', scene: '吃了变质的食物会导致身体不适', words: ['malice', 'malignant', 'malfunction', 'malnutrition', 'malady', 'malpractice']},
        {root: 'anti', meaning: '反对', scene: '两个人意见相反，激烈地争论', words: ['antibiotic', 'antifreeze', 'antipathy', 'antidote', 'antisocial', 'antithesis']},
        {root: 'auto', meaning: '自己', scene: '机器人可以自己完成各种任务', words: ['automatic', 'automobile', 'autonomy', 'autograph', 'autobiography', 'automate']},
        {root: 'bio', meaning: '生命', scene: '显微镜下观察微小的生命体', words: ['biology', 'biography', 'antibiotic', 'biopsy', 'symbiosis', 'biodegradable']},
        {root: 'chrono', meaning: '时间', scene: '沙漏里的沙子记录着时间的流逝', words: ['chronic', 'chronicle', 'synchronize', 'chronology', 'chronometer', 'anachronism']},
        {root: 'cred', meaning: '相信', scene: '因为诚实可靠，大家都相信他说的话', words: ['credit', 'credible', 'incredible', 'credential', 'creed', 'credulity']},
        {root: 'geo', meaning: '地球', scene: '地质学家研究地球内部的岩石结构', words: ['geography', 'geology', 'geometry', 'geothermal', 'geopolitics', 'geocentric']},
        {root: 'graph/gram', meaning: '写/画', scene: '用铅笔在纸上画出美丽的图案', words: ['photograph', 'autograph', 'biography', 'geography', 'diagram', 'grammar']},
        {root: 'logy', meaning: '学科', scene: '科学家在实验室里研究一门学科', words: ['biology', 'psychology', 'technology', 'sociology', 'ecology', 'theology']},
        {root: 'micro', meaning: '小', scene: '用显微镜才能看到微小的细菌', words: ['microscope', 'microphone', 'microwave', 'microchip', 'microorganism', 'microcosm']},
        {root: 'multi', meaning: '多', scene: '章鱼有很多条触手同时做不同的事', words: ['multiple', 'multiply', 'multimedia', 'multilingual', 'multitask', 'multitude']},
        {root: 'tele', meaning: '远', scene: '用望远镜看远处星星，用电话听远方声音', words: ['telephone', 'television', 'telescope', 'telegram', 'telepathy', 'telecommute']},
        {root: 'thermo', meaning: '热', scene: '冬天把手放在暖气片上感受热量', words: ['thermometer', 'thermal', 'thermostat', 'thermodynamics', 'hypothermia', 'geothermal']},
        {root: 'uni', meaning: '一', scene: '大家穿着统一的校服，看起来像一个整体', words: ['unite', 'unique', 'uniform', 'universe', 'unify', 'unanimous']},
        {root: 'vac', meaning: '空', scene: '房间搬空后显得特别空旷', words: ['vacuum', 'vacant', 'vacation', 'evacuate', 'vacancy', 'vacuous']},
        {root: 'val', meaning: '价值', scene: '古董经过鉴定后发现很有价值', words: ['value', 'valid', 'evaluate', 'equivalent', 'ambivalent', 'devalue']},
        {root: 'vid/vise', meaning: '看', scene: '用摄像机录下精彩的瞬间', words: ['video', 'evident', 'provide', 'envision', 'supervise', 'revision']},
        {root: 'act', meaning: '行动', scene: '消防员听到警报后立刻采取行动', words: ['action', 'active', 'react', 'interact', 'transaction', 'activate']},
        {root: 'cap', meaning: '头/取', scene: '用手抓住帽子的顶部戴在头上', words: ['capital', 'captain', 'capture', 'capacity', 'caption', 'capable']},
        {root: 'cede/ceed', meaning: '走/让', scene: '行人沿着人行道往前走', words: ['precede', 'recede', 'concede', 'exceed', 'proceed', 'succeed']},
        {root: 'cent', meaning: '百', scene: '一百厘米等于一米', words: ['century', 'percent', 'centimeter', 'centennial', 'centipede', 'centigrade']},
        {root: 'claim/clam', meaning: '喊叫', scene: '在人群中大声喊叫引起注意', words: ['exclaim', 'proclaim', 'acclaim', 'disclaim', 'clamor', 'declaim']},
        {root: 'clar', meaning: '清楚', scene: '擦干净眼镜后看东西变得很清楚', words: ['clarify', 'declare', 'clarity', 'clarification', 'clairvoyance', 'clarion']},
        {root: 'cogn', meaning: '知道', scene: '通过反复学习才能知道并记住知识', words: ['cognition', 'recognize', 'cognitive', 'incognito', 'cognizant', 'precognition']},
        {root: 'corp', meaning: '身体', scene: '健身让身体变得更强壮', words: ['corporate', 'corpse', 'corps', 'incorporate', 'corporeal', 'corpus']},
        {root: 'dem/demo', meaning: '人民', scene: '人民通过投票选举自己的代表', words: ['democracy', 'demographic', 'epidemic', 'demagogue', 'democrat', 'pandemic']},
        {root: 'equi', meaning: '相等', scene: '天平两端重量相等时保持平衡', words: ['equal', 'equity', 'equivalent', 'equator', 'equilibrium', 'equidistant']},
        {root: 'fact/fac', meaning: '做', scene: '工厂里的机器每天都在制造产品', words: ['factory', 'factor', 'manufacture', 'faculty', 'facile', 'facsimile']},
        {root: 'fid', meaning: '信任', scene: '朋友之间互相信任才能长久相处', words: ['confident', 'fidelity', 'confide', 'diffident', 'perfidy', 'fiduciary']},
        {root: 'fin', meaning: '结束', scene: '跑完马拉松最后一公里终于到达终点', words: ['finish', 'final', 'define', 'infinite', 'confine', 'finance']},
        {root: 'flex/flect', meaning: '弯曲', scene: '瑜伽老师轻松地把身体向后弯曲', words: ['flexible', 'reflect', 'deflect', 'inflection', 'genuflect', 'circumflex']},
        {root: 'flu', meaning: '流动', scene: '河水不停地流动汇入大海', words: ['fluent', 'influence', 'fluid', 'fluctuate', 'affluent', 'confluence']},
        {root: 'gen', meaning: '产生', scene: '种子在土壤里发芽产生新的生命', words: ['generate', 'gene', 'generous', 'genius', 'genuine', 'degenerate']},
        {root: 'grad/gress', meaning: '步/走', scene: '一步一步地走上台阶', words: ['gradual', 'progress', 'graduate', 'aggressive', 'degrade', 'retrograde']},
        {root: 'grat', meaning: '感谢', scene: '收到礼物后真诚地表示感谢', words: ['grateful', 'congratulate', 'gratitude', 'gratify', 'ingratiate', 'gratis']},
        {root: 'ject', meaning: '投掷', scene: '把纸飞机用力投向空中', words: ['project', 'reject', 'inject', 'subject', 'object', 'trajectory']},
        {root: 'jud', meaning: '判断', scene: '法官在法庭上做出公正的判断', words: ['judge', 'prejudice', 'judicial', 'adjudicate', 'judicious', 'misjudge']},
        {root: 'lect', meaning: '选择/读', scene: '从书架上挑选一本喜欢的书来读', words: ['select', 'collect', 'elect', 'lecture', 'neglect', 'intellect']},
        {root: 'leg', meaning: '法律', scene: '律师在法庭上引用法律条文辩护', words: ['legal', 'legislate', 'legitimate', 'privilege', 'allegation', 'legacy']},
        {root: 'liber', meaning: '自由', scene: '小鸟飞出笼子获得自由', words: ['liberty', 'liberal', 'liberate', 'deliberate', 'illiberal', 'libertarian']},
        {root: 'liter', meaning: '文字', scene: '用文字记录下每天发生的事情', words: ['literature', 'literal', 'literacy', 'illiterate', 'obliterate', 'alliteration']},
        {root: 'loc', meaning: '地方', scene: '在地图上标记出要去的地方', words: ['local', 'locate', 'location', 'allocate', 'dislocate', 'locomotive']},
        {root: 'luc/lum', meaning: '光', scene: '打开手电筒照亮黑暗的房间', words: ['lucid', 'illuminate', 'luminous', 'translucent', 'luminary', 'elucidate']},
        {root: 'magni', meaning: '大', scene: '用放大镜把微小的字变得很大', words: ['magnificent', 'magnify', 'magnitude', 'magnanimous', 'magnate', 'magnum']},
        {root: 'man', meaning: '手', scene: '用手工精心制作每一件工艺品', words: ['manual', 'manage', 'manipulate', 'manuscript', 'maneuver', 'emancipate']},
        {root: 'mand', meaning: '命令', scene: '指挥官下达命令后士兵立刻行动', words: ['command', 'demand', 'mandate', 'mandatory', 'countermand', 'commend']},
        {root: 'mem', meaning: '记忆', scene: '把重要的信息记在脑海里', words: ['memory', 'memorize', 'memorial', 'commemorate', 'memento', 'memoir']},
        {root: 'ment', meaning: '心/思', scene: '用心思考才能解决难题', words: ['mental', 'mention', 'comment', 'mentor', 'commentary', 'mentation']},
        {root: 'min', meaning: '小', scene: '用显微镜观察微小的细胞', words: ['minimum', 'minor', 'minus', 'minute', 'diminish', 'miniature']},
        {root: 'mir', meaning: '惊奇', scene: '看到魔术表演时感到非常惊奇', words: ['miracle', 'mirror', 'admire', 'marvel', 'mirage', 'mirth']},
        {root: 'mon/monit', meaning: '警告', scene: '烟雾报警器发出刺耳的警告声', words: ['monitor', 'admonish', 'premonition', 'summon', 'monument', 'monition']},
        {root: 'mort', meaning: '死', scene: '秋天的落叶枯萎死亡回归大地', words: ['mortal', 'immortal', 'mortgage', 'mortify', 'postmortem', 'mortuary']},
        {root: 'mot', meaning: '移动', scene: '汽车在高速公路上快速移动', words: ['motion', 'motor', 'promote', 'emotion', 'motivate', 'remote']},
        {root: 'nat', meaning: '出生', scene: '婴儿出生时发出响亮的哭声', words: ['nature', 'native', 'nation', 'natural', 'innate', 'renaissance']},
        {root: 'nav', meaning: '船', scene: '船长驾驶轮船航行在广阔的海面上', words: ['navy', 'navigate', 'naval', 'navigation', 'circumnavigate', 'nausea']},
        {root: 'neg', meaning: '否定', scene: '摇头表示否定对方的提议', words: ['negative', 'neglect', 'negotiate', 'negligible', 'renege', 'negate']},
        {root: 'nom/nym', meaning: '名字', scene: '给刚出生的小猫取一个可爱的名字', words: ['name', 'nominate', 'synonym', 'anonymous', 'pseudonym', 'acronym']},
        {root: 'nov', meaning: '新', scene: '新年第一天穿上崭新的衣服', words: ['novel', 'innovate', 'renovate', 'novice', 'novelty', 'nova']},
        {root: 'ord/ordin', meaning: '顺序', scene: '排队时按照先来后到的顺序', words: ['order', 'ordinary', 'coordinate', 'subordinate', 'insubordinate', 'ordinal']},
        {root: 'path', meaning: '感受', scene: '朋友难过时你能感受到他的心情', words: ['sympathy', 'empathy', 'apathy', 'pathology', 'pathetic', 'antipathy']},
        {root: 'ped', meaning: '脚', scene: '用脚一步一步地走完漫长的路程', words: ['pedestrian', 'pedal', 'expedition', 'impede', 'centipede', 'pedestal']},
        {root: 'pend/pens', meaning: '悬挂/称量', scene: '用天平称量物品的重量', words: ['depend', 'suspend', 'expense', 'pension', 'compensate', 'dispense']},
        {root: 'phil', meaning: '爱', scene: '热爱读书的人会在图书馆待一整天', words: ['philosophy', 'philanthropy', 'bibliophile', 'philharmonic', 'philology', 'anglophile']},
        {root: 'phon', meaning: '声音', scene: '对着麦克风说话声音被放大', words: ['telephone', 'microphone', 'symphony', 'phonetic', 'cacophony', 'euphony']},
        {root: 'photo', meaning: '光', scene: '用相机捕捉光线拍出美丽的照片', words: ['photograph', 'photon', 'photosynthesis', 'photocopy', 'photogenic', 'telephoto']},
        {root: 'phys', meaning: '自然/身体', scene: '物理学家研究自然界的规律', words: ['physical', 'physician', 'physics', 'physique', 'physiology', 'metaphysics']},
        {root: 'plen/plet', meaning: '满', scene: '往杯子里倒水直到水满溢出', words: ['plenty', 'complete', 'replenish', 'supplement', 'plenitude', 'deplete']},
        {root: 'pli/plic', meaning: '折叠', scene: '把地图沿着折痕折叠起来', words: ['apply', 'imply', 'reply', 'complicate', 'explicit', 'duplicate']},
        {root: 'poli', meaning: '城市/政治', scene: '市民在城市广场讨论公共事务', words: ['politics', 'policy', 'polite', 'metropolitan', 'cosmopolitan', 'politician']},
        {root: 'pon/pos', meaning: '放置', scene: '把书签放在读到的那一页', words: ['postpone', 'position', 'positive', 'compose', 'deposit', 'dispose']},
        {root: 'popul', meaning: '人民', scene: '广场上聚集了很多人民', words: ['popular', 'population', 'populate', 'populace', 'populist', 'depopulate']},
        {root: 'prim', meaning: '第一', scene: '比赛获得第一名站在领奖台最高处', words: ['primary', 'prime', 'primitive', 'primal', 'primacy', 'primer']},
        {root: 'psych', meaning: '心灵', scene: '心理学家倾听来访者内心的声音', words: ['psychology', 'psyche', 'psychic', 'psychiatry', 'psychosis', 'psychedelic']},
        {root: 'punct', meaning: '点/刺', scene: '用针尖在纸上刺出一个小点', words: ['punctual', 'punctuate', 'puncture', 'acupuncture', 'pungent', 'compunction']},
        {root: 'rect', meaning: '直/正', scene: '用尺子画出一条笔直的线', words: ['correct', 'direct', 'erect', 'rectangle', 'rectify', 'rectitude']},
        {root: 'reg', meaning: '统治', scene: '国王统治着这片广袤的土地', words: ['regular', 'region', 'regulate', 'regime', 'regal', 'interregnum']},
        {root: 'sanct', meaning: '神圣', scene: '信徒在神圣的教堂里虔诚祈祷', words: ['sanctuary', 'sanction', 'sanctify', 'sacrosanct', 'sanctimonious', 'sanctum']},
        {root: 'sci', meaning: '知道', scene: '科学家通过实验来知道真相', words: ['science', 'conscious', 'omniscient', 'prescient', 'conscience', 'scientist']},
        {root: 'sens/sent', meaning: '感觉', scene: '用手触摸花瓣感受它的柔软', words: ['sense', 'sensitive', 'sentence', 'consent', 'resent', 'sentiment']},
        {root: 'sequ/secu', meaning: '跟随', scene: '小狗紧紧地跟随在主人身后', words: ['sequence', 'consequence', 'subsequent', 'pursue', 'execute', 'persecute']},
        {root: 'serv', meaning: '服务/保存', scene: '服务员热情地为客人提供服务', words: ['serve', 'observe', 'preserve', 'reserve', 'conservation', 'deserve']},
        {root: 'sign', meaning: '标记', scene: '在重要的文件上做标记并签名', words: ['signal', 'design', 'assign', 'resign', 'significant', 'insignia']},
        {root: 'simil/simul', meaning: '相似', scene: '双胞胎长得非常相似难以区分', words: ['similar', 'simulate', 'simultaneous', 'assimilate', 'facsimile', 'verisimilitude']},
        {root: 'soci', meaning: '同伴', scene: '和同伴一起参加社交活动', words: ['social', 'society', 'associate', 'sociology', 'dissociate', 'sociable']},
        {root: 'sol', meaning: '单独', scene: '独自一人在沙漠中行走', words: ['solo', 'solitary', 'solitude', 'desolate', 'isolate', 'soliloquy']},
        {root: 'solv/solu', meaning: '解开', scene: '解开缠绕在一起的耳机线', words: ['solve', 'solution', 'resolve', 'dissolve', 'absolve', 'solvent']},
        {root: 'somn', meaning: '睡眠', scene: '躺在柔软的床上很快进入睡眠', words: ['insomnia', 'somnolent', 'somnambulist', 'somniferous', 'somniloquy', 'hypersomnia']},
        {root: 'son', meaning: '声音', scene: '用音响播放出悦耳的声音', words: ['sound', 'sonic', 'resonate', 'consonant', 'dissonant', 'supersonic']},
        {root: 'soph', meaning: '智慧', scene: '智慧的老人给年轻人传授人生经验', words: ['philosophy', 'sophisticated', 'sophomore', 'sophistry', 'theosophy', 'pansophy']},
        {root: 'spec/spic', meaning: '看', scene: '用放大镜仔细观察标本的细节', words: ['special', 'specific', 'specimen', 'conspicuous', 'suspicious', 'perspicacious']},
        {root: 'spir', meaning: '呼吸', scene: '深呼吸让新鲜的空气充满肺部', words: ['spirit', 'inspire', 'respire', 'conspire', 'perspire', 'aspire']},
        {root: 'strict', meaning: '拉紧', scene: '把绳子拉紧后系在柱子上', words: ['strict', 'restrict', 'constrict', 'district', 'stringent', 'astringent']},
        {root: 'sum/sumpt', meaning: '拿/用', scene: '从钱包里拿出钱来使用', words: ['consume', 'assume', 'resume', 'presume', 'sumptuous', 'consumption']},
        {root: 'tact/tang', meaning: '触', scene: '轻轻触碰含羞草叶子就会合拢', words: ['contact', 'intact', 'tactile', 'tangible', 'contagious', 'tangent']},
        {root: 'temp', meaning: '时间', scene: '沙漏记录着时间的流逝', words: ['temporary', 'contemporary', 'tempo', 'extemporaneous', 'tempus', 'temporal']},
        {root: 'tend/tens', meaning: '伸展', scene: '伸展开双臂拥抱清晨的阳光', words: ['extend', 'intend', 'attend', 'tension', 'intense', 'pretend']},
        {root: 'terr', meaning: '土地', scene: '农民在土地上耕种庄稼', words: ['territory', 'terrain', 'terrestrial', 'terrace', 'inter', 'subterranean']},
        {root: 'test', meaning: '证明', scene: '用实验数据来证明理论的正确性', words: ['test', 'protest', 'contest', 'testify', 'testament', 'attest']},
        {root: 'theo', meaning: '神', scene: '古代人相信神掌管着世间万物', words: ['theology', 'atheist', 'theist', 'theocracy', 'pantheon', 'apotheosis']},
        {root: 'therm', meaning: '热', scene: '用手触摸热水杯感受热量', words: ['thermal', 'thermometer', 'thermostat', 'thermodynamics', 'hypothermia', 'geothermal']},
        {root: 'tort', meaning: '扭曲', scene: '把湿毛巾用力扭曲拧干水分', words: ['torture', 'distort', 'retort', 'contort', 'extort', 'tortuous']},
        {root: 'tox', meaning: '毒', scene: '误食有毒的蘑菇会导致中毒', words: ['toxic', 'detox', 'toxin', 'intoxicate', 'antitoxin', 'toxicity']},
        {root: 'trib', meaning: '给予', scene: '把礼物赠予给最好的朋友', words: ['tribute', 'contribute', 'distribute', 'attribute', 'retribution', 'tributary']},
        {root: 'trud/trus', meaning: '推', scene: '用力推开沉重的大门', words: ['intrude', 'protrude', 'obtrusive', 'abstruse', 'extrude', 'detrude']},
        {root: 'turb', meaning: '搅动', scene: '用勺子搅动咖啡让糖融化', words: ['disturb', 'turbulent', 'perturb', 'turbine', 'turmoil', 'disturbance']},
        {root: 'umbr', meaning: '阴影', scene: '夏天在大树的阴影下乘凉', words: ['umbrella', 'umbrage', 'penumbra', 'adumbrate', 'somber', 'umbra']},
        {root: 'urb', meaning: '城市', scene: '城市里高楼林立车水马龙', words: ['urban', 'suburb', 'urbane', 'interurban', 'exurban', 'urbanize']},
        {root: 'vac', meaning: '空', scene: '把房间清空后显得很宽敞', words: ['vacuum', 'vacant', 'vacation', 'evacuate', 'vacancy', 'vacuous']},
        {root: 'vad/vas', meaning: '走', scene: '沿着小路走进茂密的森林', words: ['invade', 'pervade', 'evade', 'invasion', 'pervasive', 'evasive']},
        {root: 'ven/vent', meaning: '来', scene: '朋友从远方来到你家做客', words: ['event', 'prevent', 'invent', 'adventure', 'convention', 'intervene']},
        {root: 'ver', meaning: '真实', scene: '法官要求证人说出真实的经过', words: ['verify', 'verdict', 'version', 'versus', 'aver', 'veracious']},
        {root: 'verb', meaning: '词语', scene: '用恰当的词语表达自己的想法', words: ['verbal', 'verb', 'verbose', 'proverb', 'adverb', 'verbiage']},
        {root: 'via', meaning: '路', scene: '沿着这条路可以到达目的地', words: ['via', 'viaduct', 'deviate', 'obvious', 'previous', 'trivial']},
        {root: 'vid/vis', meaning: '看', scene: '用摄像机录下美好的瞬间', words: ['video', 'evident', 'provide', 'vision', 'supervise', 'revise']},
        {root: 'viv/vit', meaning: '生命', scene: '春天万物复苏充满生命的气息', words: ['vivid', 'survive', 'revive', 'vital', 'vitamin', 'vivacious']},
        {root: 'voc/vok', meaning: '声音/叫', scene: '对着山谷大声叫喊听到回声', words: ['vocal', 'advocate', 'provoke', 'revoke', 'evoke', 'vociferous']},
        {root: 'vol', meaning: '飞', scene: '鸟儿展开翅膀在天空中飞翔', words: ['volatile', 'volley', 'volcano', 'volition', 'benevolent', 'malevolent']},
        {root: 'volv/volut', meaning: '转/卷', scene: '把地图卷起来放进筒里', words: ['involve', 'evolve', 'revolve', 'revolution', 'volume', 'convoluted']},
    ];

    // 渲染高频词根（按频率排序：spect, dict, struct, port, tract 等高频在前）
    function renderRoots() {
        var grid = document.getElementById('rootGrid');
        var count = document.getElementById('rootCount');
        if (!grid) return;
        count.textContent = HIGH_FREQ_ROOTS.length + ' 个';
        grid.innerHTML = HIGH_FREQ_ROOTS.map(function(r) {
            var wordsHtml = r.words.map(function(w) {
                return '<span class="root-word-tag" onclick="window.handleWordAnalysis(\'' + w + '\')">' + w + '</span>';
            }).join('');
            return '<div class="root-card">' +
                '<div class="root-name">-' + r.root + '-</div>' +
                '<div class="root-meaning">' + r.meaning + '</div>' +
                '<div class="root-scene">💡 ' + r.scene + ' → 记住 ' + r.root + '=' + r.meaning + '</div>' +
                '<div class="root-words">' + wordsHtml + '</div>' +
                '</div>';
        }).join('');
    }

    // 切换折叠（默认折叠，点击展开）
    window.toggleRootSection = function() {
        var body = document.getElementById('rootSectionBody');
        var icon = document.getElementById('rootFoldIcon');
        if (!body) return;
        var isCollapsed = body.classList.toggle('collapsed');
        icon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)';
        icon.textContent = isCollapsed ? '▶' : '▼';
    };

    // ===== 隐藏加载状态，显示应用内容 =====
    (function() {
        var loading = document.getElementById('appLoading');
        var content = document.getElementById('appContent');
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = '';
    })();

    // ===== 初始化 =====
    renderRoots();
    updateDueCount();
    loadReviewPanelState();
    if (reviewPanelState.isOpen) {
        openReviewPanel();
    }
    if (getDueWords().length > 0 && !localStorage.getItem('reminded_today')) {
        setTimeout(() => {
            toast('📚 有 ' + getDueWords().length + ' 个单词需要复习', 'warning');
            localStorage.setItem('reminded_today', new Date().toDateString());
        }, 3000);
    }
})();
