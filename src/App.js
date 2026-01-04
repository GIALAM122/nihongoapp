import { useState, useEffect, useMemo, useRef } from "react";

// Khóa lưu trữ
const STORAGE_KEY = "jp_master_cards_v2";
const FOLDER_KEY = "jp_master_folders_v2";

export default function FullQuizletApp() {
  // --- 1. KHỞI TẠO DỮ LIỆU (LOCAL STORAGE) ---
  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem(FOLDER_KEY);
    return saved ? JSON.parse(saved) : [{ id: "1", name: "Bộ từ mẫu N3", desc: "Chữ Hán căn bản" }];
  });

  // Tự động lưu khi có thay đổi
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
  }, [cards, folders]);

  // --- 2. STATES QUẢN LÝ GIAO DIỆN ---
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [mode, setMode] = useState("flashcard"); // flashcard, write, quiz, game, edit
  const [searchTerm, setSearchTerm] = useState("");
  
  // States cho Flashcard/Học
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  
  // States cho Swipe (Mobile)
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // States cho Write Mode
  const [writeInput, setWriteInput] = useState("");
  const [writeFeedback, setWriteFeedback] = useState(null);

  // States cho Quiz Mode (Đã sửa lỗi)
  const [quizPool, setQuizPool] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  // States cho Game Mode
  const [gameActive, setGameActive] = useState(false);
  const [gameCards, setGameCards] = useState([]);
  const [gameTime, setGameTime] = useState(0);
  const [firstSelection, setFirstSelection] = useState(null);

  // States cho Form/Edit
  const [newFolder, setNewFolder] = useState({ name: "", desc: "" });
  const [inputTerm, setInputTerm] = useState("");
  const [inputDef, setInputDef] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const fileInputRef = useRef(null);

  // --- 3. DỮ LIỆU TÍNH TOÁN (COMPUTED) ---
  const currentFolder = folders.find(f => f.id === activeFolderId);
  
  const folderCards = useMemo(() => {
    let base = cards.filter((c) => c.folderId === activeFolderId);
    return isShuffled ? [...base].sort(() => Math.random() - 0.5) : base;
  }, [cards, activeFolderId, isShuffled]);

  const filteredCards = useMemo(() => 
    folderCards.filter(c => 
      c.term.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.definition.toLowerCase().includes(searchTerm.toLowerCase())
    ), [folderCards, searchTerm]);

  // --- 4. HÀM HỖ TRỢ (HELPERS) ---
  const speakJP = (text) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = 0.8;
    window.speechSynthesis.speak(u);
  };

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % (folderCards.length || 1));
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + folderCards.length) % (folderCards.length || 1));
  };

  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 70) nextCard();
    if (distance < -70) prevCard();
    setTouchStart(null); setTouchEnd(null);
  };

  // --- 5. LOGIC TRÒ CHƠI GHÉP CẶP ---
  const startMatchGame = () => {
    if (folderCards.length < 3) return alert("Cần ít nhất 3 thẻ để chơi!");
    const count = Math.min(folderCards.length, 6);
    const selected = [...folderCards].sort(() => 0.5 - Math.random()).slice(0, count);
    const pool = [
      ...selected.map(c => ({ id: c.id, text: c.term, type: 't' })),
      ...selected.map(c => ({ id: c.id, text: c.definition, type: 'd' }))
    ].sort(() => 0.5 - Math.random());
    setGameCards(pool); setGameActive(true); setGameTime(0); setFirstSelection(null);
  };

  useEffect(() => {
    let t; if (gameActive) t = setInterval(() => setGameTime(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [gameActive]);

  const handleGameClick = (card, idx) => {
    if (card.matched || firstSelection?.idx === idx) return;
    if (card.type === 't') speakJP(card.text);
    if (!firstSelection) setFirstSelection({ ...card, idx });
    else {
      if (firstSelection.id === card.id && firstSelection.type !== card.type) {
        setGameCards(prev => prev.map(c => c.id === card.id ? { ...c, matched: true } : c));
        setFirstSelection(null);
      } else {
        setFirstSelection({ ...card, idx });
        setTimeout(() => setFirstSelection(null), 400);
      }
    }
  };

  // --- 6. GIAO DIỆN DANH SÁCH BỘ THẺ ---
  if (!activeFolderId) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] p-6 md:p-16 font-sans">
        <header className="max-w-6xl mx-auto mb-12">
          <h1 className="text-5xl font-black text-slate-800 tracking-tighter mb-2 italic">KANJI <span className="text-[#4255FF] not-italic">GIALAM</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">^^ranh se update</p>
        </header>

        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Nút tạo bộ mới */}
          <div className="bg-white p-8 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col justify-center shadow-sm">
            <h3 className="text-xl font-black mb-4">Tạo bộ thẻ mới</h3>
            <input value={newFolder.name} onChange={e => setNewFolder({...newFolder, name: e.target.value})} placeholder="Tên bộ (VD: N2 từ vựng)..." className="p-4 bg-slate-50 rounded-2xl mb-3 outline-none font-bold text-sm border-2 border-transparent focus:border-[#4255FF] transition-all" />
            <button onClick={() => {
                if(!newFolder.name) return; 
                setFolders([...folders, {id: Date.now().toString(), name: newFolder.name}]); 
                setNewFolder({name:""});
            }} className="w-full py-4 bg-[#4255FF] text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">Tạo ngay</button>
          </div>

          {folders.map(f => (
            <div key={f.id} onClick={() => {setActiveFolderId(f.id); setMode("flashcard"); setCurrentIndex(0);}} className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all cursor-pointer border border-slate-100 active:scale-95 group">
              <div className="w-14 h-14 bg-blue-50 text-2xl flex items-center justify-center rounded-2xl mb-6 group-hover:bg-[#4255FF] group-hover:text-white transition-all">📚</div>
              <h3 className="text-xl font-black mb-2 truncate text-slate-800">{f.name}</h3>
              <div className="flex justify-between items-center border-t pt-4 mt-10">
                <span className="text-[10px] font-black px-3 py-1 bg-slate-100 rounded-full text-slate-500 uppercase">
                  {cards.filter(c => c.folderId === f.id).length} thẻ
                </span>
                <span className="text-[#4255FF] font-black text-xs uppercase">Học →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- 7. GIAO DIỆN CHI TIẾT KHI VÀO 1 BỘ THẺ ---
  return (
    <div className="min-h-screen bg-[#F6F7FB] font-sans text-slate-800 pb-20">
      {/* Thanh điều hướng */}
      <nav className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => setActiveFolderId(null)} className="font-black text-slate-400 hover:text-slate-800 px-2 transition-colors text-xl">✕</button>
          <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-[80%]">
            {[
                {id:'flashcard', n:'Thẻ'}, {id:'write', n:'Gõ'}, 
                {id:'quiz', n:'Test'}, {id:'game', n:'Ghép'}, {id:'edit', n:'Sửa'}
            ].map(m => (
              <button key={m.id} onClick={() => {setMode(m.id); setIsFlipped(false); setQuizPool([]); setGameActive(false); setCurrentIndex(0);}}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${mode === m.id ? "bg-white text-[#4255FF] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                {m.n}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 pt-8">
        {folderCards.length === 0 && mode !== 'edit' ? (
          <div className="py-20 text-center border-4 border-dashed border-slate-200 rounded-[3rem]">
            <p className="text-slate-400 font-black mb-4 uppercase text-sm">Chưa có thẻ nào trong bộ này</p>
            <button onClick={() => setMode('edit')} className="px-8 py-3 bg-[#4255FF] text-white font-black rounded-xl">Thêm thẻ ngay</button>
          </div>
        ) : (
          <div className="animate-in">
            {/* --- FLASHCARD MODE --- */}
            {mode === 'flashcard' && (
              <div className="flex flex-col items-center">
                <div className="w-full bg-slate-200 h-1.5 rounded-full mb-8 overflow-hidden">
                  <div className="bg-[#4255FF] h-full transition-all duration-500" style={{width: `${((currentIndex + 1) / folderCards.length) * 100}%`}}></div>
                </div>

                <div className="w-full h-[400px] md:h-[480px] perspective touch-none"
                  onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                  onClick={() => { if(!isFlipped) speakJP(folderCards[currentIndex].term); setIsFlipped(!isFlipped); }}
                >
                  <div className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
                    <div className="absolute inset-0 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center backface-hidden p-8 text-center">
                       <span className="text-8xl md:text-9xl font-black text-slate-800 tracking-tighter">{folderCards[currentIndex].term}</span>
                       <p className="mt-12 text-slate-300 font-bold uppercase tracking-[0.3em] text-[10px]">Chạm để lật mặt sau</p>
                    </div>
                    <div className="absolute inset-0 bg-white border-4 border-[#4255FF] rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center rotate-y-180 backface-hidden p-8 text-center">
                       <h3 className="text-4xl md:text-5xl font-black text-[#4255FF] mb-6">{folderCards[currentIndex].definition}</h3>
                       <button onClick={(e) => {e.stopPropagation(); speakJP(folderCards[currentIndex].term)}} className="w-16 h-16 bg-blue-50 text-[#4255FF] rounded-full text-2xl active:scale-90 transition-transform">🔊</button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-12">
                  <button onClick={() => setIsShuffled(!isShuffled)} className={`w-12 h-12 rounded-full font-black text-xs border-2 transition-all ${isShuffled ? 'bg-[#4255FF] border-[#4255FF] text-white' : 'bg-white border-slate-100 text-slate-400'}`}>🔀</button>
                  <button onClick={prevCard} className="w-16 h-16 bg-white rounded-2xl shadow-lg font-black text-xl active:scale-75 border border-slate-100">←</button>
                  <span className="text-slate-800 font-black text-sm min-w-[70px] text-center">{currentIndex + 1} / {folderCards.length}</span>
                  <button onClick={nextCard} className="w-16 h-16 bg-white rounded-2xl shadow-lg font-black text-xl active:scale-75 border border-slate-100">→</button>
                  <button onClick={() => speakJP(folderCards[currentIndex].term)} className="w-12 h-12 bg-white rounded-full font-black text-xs border-2 border-slate-100 shadow-sm">🔊</button>
                </div>
              </div>
            )}

            {/* --- WRITE MODE --- */}
            {mode === 'write' && (
              <div className="max-w-2xl mx-auto bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="text-center mb-10">
                  <h3 className="text-8xl font-black text-slate-800 mb-6">{folderCards[currentIndex].term}</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Nhập nghĩa hoặc cách đọc chữ này</p>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (writeInput.trim().toLowerCase() === folderCards[currentIndex].definition.toLowerCase()) {
                    setWriteFeedback({ isCorrect: true, msg: "Quá chuẩn! ✨" });
                    speakJP(folderCards[currentIndex].term);
                    setTimeout(() => { setWriteInput(""); setWriteFeedback(null); nextCard(); }, 1000);
                  } else {
                    setWriteFeedback({ isCorrect: false, msg: `Chưa đúng! Đáp án là: ${folderCards[currentIndex].definition}` });
                  }
                }} className="space-y-6">
                  <input autoFocus value={writeInput} onChange={e => setWriteInput(e.target.value)} 
                    className={`w-full p-6 text-center text-2xl font-black rounded-2xl border-4 outline-none transition-all ${writeFeedback ? (writeFeedback.isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700') : 'border-slate-50 focus:border-[#4255FF]'}`} 
                    placeholder="..." />
                  {writeFeedback && <p className={`text-center font-black text-sm ${writeFeedback.isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>{writeFeedback.msg}</p>}
                  <button type="submit" className="w-full py-5 bg-slate-800 text-white font-black rounded-2xl active:scale-95 shadow-xl">Kiểm tra ngay</button>
                </form>
              </div>
            )}

            {/* --- QUIZ MODE (FIXED LOGIC) --- */}
            {mode === 'quiz' && (
              <div className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[500px] flex flex-col items-center justify-center">
                {quizPool.length === 0 ? (
                  <div className="text-center">
                    <h3 className="font-black text-2xl mb-8">Bắt đầu bài kiểm tra?</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {[5, 10, folderCards.length].map(n => (
                        <button key={n} onClick={() => {
                          const shuffled = [...folderCards].sort(() => 0.5 - Math.random());
                          const selected = shuffled.slice(0, n);
                          const prepared = selected.map(card => {
                            const distractors = folderCards
                              .filter(c => c.id !== card.id)
                              .sort(() => 0.5 - Math.random())
                              .slice(0, 3)
                              .map(c => c.definition);
                            const choices = [...distractors, card.definition].sort(() => 0.5 - Math.random());
                            return { ...card, choices };
                          });
                          setQuizPool(prepared); setQuizScore(0); setCurrentQuizIndex(0); setQuizFinished(false); setSelectedAnswer(null);
                        }} className="px-10 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black hover:border-[#4255FF] hover:bg-blue-50 transition-all">
                          {n === folderCards.length ? "Tất cả" : `${n} câu`}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : !quizFinished ? (
                  <div className="w-full max-w-xl">
                    <div className="flex justify-between items-center mb-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Câu {currentQuizIndex + 1} / {quizPool.length}</span>
                        <span className="text-[10px] font-black text-[#4255FF] uppercase tracking-widest">Điểm: {quizScore}</span>
                    </div>
                    <h2 className="text-8xl font-black text-center mb-12">{quizPool[currentQuizIndex]?.term}</h2>
                    <div className="grid grid-cols-1 gap-3">
                      {quizPool[currentQuizIndex]?.choices.map((ans, i) => (
                        <button key={i} disabled={!!selectedAnswer} onClick={() => {
                          setSelectedAnswer(ans);
                          if (ans === quizPool[currentQuizIndex].definition) {
                              setQuizScore(s => s + 1);
                              speakJP(quizPool[currentQuizIndex].term);
                          }
                          setTimeout(() => {
                            if (currentQuizIndex < quizPool.length - 1) { setCurrentQuizIndex(prev => prev + 1); setSelectedAnswer(null); }
                            else setQuizFinished(true);
                          }, 1000);
                        }} className={`p-6 border-2 rounded-2xl text-left font-bold transition-all ${selectedAnswer ? (ans === quizPool[currentQuizIndex].definition ? "bg-emerald-50 border-emerald-500 text-emerald-700" : (ans === selectedAnswer ? "bg-rose-50 border-rose-500 text-rose-700" : "opacity-30 border-slate-100")) : "border-slate-50 hover:bg-slate-50"}`}>
                          {ans}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-7xl mb-6">🎯</div>
                    <h2 className="text-3xl font-black mb-2">Hoàn thành!</h2>
                    <p className="text-slate-400 font-bold mb-8 italic">Bạn đạt {quizScore} / {quizPool.length} điểm</p>
                    <button onClick={() => setQuizPool([])} className="px-12 py-5 bg-[#4255FF] text-white font-black rounded-2xl shadow-xl shadow-blue-200">Làm lại bài mới</button>
                  </div>
                )}
              </div>
            )}

            {/* --- GAME MODE --- */}
            {mode === 'game' && (
              <div className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[500px] flex flex-col justify-center items-center">
                {!gameActive ? (
                  <div className="text-center">
                    <div className="text-6xl mb-6">🧩</div>
                    <h3 className="text-2xl font-black mb-6">Ghép cặp chữ Hán</h3>
                    <button onClick={startMatchGame} className="px-12 py-5 bg-slate-800 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform">Bắt đầu ngay</button>
                  </div>
                ) : (
                  <div className="w-full max-w-3xl">
                    <div className="flex justify-between items-center mb-8">
                      <span className="font-black text-[#4255FF] text-xl">⏱ {gameTime}s</span>
                      <button onClick={() => setGameActive(false)} className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-600">Thoát game</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {gameCards.map((c, idx) => (
                        <button key={idx} onClick={() => handleGameClick(c, idx)} 
                          className={`h-24 md:h-32 p-4 border-2 rounded-3xl font-black transition-all flex items-center justify-center text-center text-lg ${c.matched ? "opacity-0 scale-50 pointer-events-none" : "bg-white"} ${firstSelection?.idx === idx ? "border-[#4255FF] text-[#4255FF] bg-blue-50 scale-105" : "border-slate-50 shadow-sm hover:border-slate-200"}`}>
                          {c.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- EDIT MODE --- */}
            {mode === 'edit' && (
              <div className="space-y-8 animate-in pb-20">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">Quản lý nội dung</h3>
                        <p className="text-slate-400 font-bold text-xs uppercase mt-1">{currentFolder?.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => fileInputRef.current.click()} className="text-[9px] font-black px-4 py-3 bg-emerald-50 text-emerald-600 rounded-xl uppercase">Nhập File .TXT</button>
                      <button onClick={() => setShowImport(!showImport)} className="text-[9px] font-black px-4 py-3 bg-blue-50 text-[#4255FF] rounded-xl uppercase">Nhập nhanh</button>
                      <input type="file" ref={fileInputRef} onChange={(e) => {
                        const file = e.target.files[0];
                        if(!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const lines = event.target.result.split("\n").filter(l => l.trim());
                          const newC = lines.map(l => {
                            const p = l.split(/[|]|,/);
                            return (p[0] && p[1]) ? { id: Date.now()+Math.random(), term: p[0].trim(), definition: p[1].trim(), folderId: activeFolderId } : null;
                          }).filter(Boolean);
                          setCards([...cards, ...newC]);
                        };
                        reader.readAsText(file);
                      }} className="hidden" />
                    </div>
                  </div>
                  
                  {showImport ? (
                    <div className="space-y-4 mb-10 bg-slate-50 p-6 rounded-3xl">
                      <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Mỗi dòng một từ: Từ | Nghĩa (VD: 猫 | Con mèo)" className="w-full h-40 p-5 bg-white rounded-2xl outline-none font-bold text-sm border-2 border-slate-100 focus:border-[#4255FF]" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowImport(false)} className="flex-1 py-4 font-black text-slate-400">Hủy</button>
                        <button onClick={() => {
                            const lines = importText.split("\n").filter(l => l.trim());
                            const newImported = lines.map(l => {
                                const p = l.split(/[|]|,/);
                                return (p[0] && p[1]) ? { id: Date.now()+Math.random(), term: p[0].trim(), definition: p[1].trim(), folderId: activeFolderId } : null;
                            }).filter(Boolean);
                            setCards([...cards, ...newImported]); setImportText(""); setShowImport(false);
                        }} className="flex-[2] py-4 bg-[#4255FF] text-white font-black rounded-2xl shadow-lg">Lưu danh sách</button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <input value={inputTerm} onChange={e => setInputTerm(e.target.value)} placeholder="Hán tự/Từ vựng" className="md:col-span-2 p-5 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[#4255FF] transition-all text-sm" />
                      <input value={inputDef} onChange={e => setInputDef(e.target.value)} placeholder="Nghĩa & Cách đọc" className="md:col-span-2 p-5 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[#4255FF] transition-all text-sm" />
                      <button onClick={() => {
                          if(!inputTerm || !inputDef) return; 
                          setCards([...cards, { id: Date.now(), term: inputTerm, definition: inputDef, folderId: activeFolderId }]); 
                          setInputTerm(""); setInputDef("");
                      }} className="bg-[#4255FF] text-white font-black rounded-2xl py-5 active:scale-95 shadow-lg shadow-blue-100 transition-all">Thêm thẻ</button>
                    </div>
                  )}
                </div>

                <div className="relative group">
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm nhanh trong bộ này..." className="w-full p-5 pl-14 bg-white rounded-[2rem] border-2 border-slate-100 outline-none font-bold text-sm shadow-sm focus:border-[#4255FF] transition-all" />
                  <span className="absolute left-6 top-5 opacity-30 group-focus-within:opacity-100 transition-opacity">🔍</span>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-8 py-4">Mặt trước</th>
                            <th className="px-8 py-4">Mặt sau</th>
                            <th className="px-8 py-4 text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredCards.map((c) => (
                        <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-8 py-5 font-black text-3xl text-slate-800">{c.term}</td>
                          <td className="px-8 py-5 font-bold text-slate-500">{c.definition}</td>
                          <td className="px-8 py-5 text-right">
                            <button onClick={() => { if(confirm("Xóa thẻ này?")) setCards(cards.filter(x => x.id !== c.id)) }} className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity active:scale-75">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button onClick={() => {
                    if(window.confirm(`Bạn có chắc muốn XÓA TOÀN BỘ ["${currentFolder?.name}"]? Hành động này không thể hoàn tác.`)) {
                        setFolders(folders.filter(f => f.id !== activeFolderId));
                        setCards(cards.filter(c => c.folderId !== activeFolderId));
                        setActiveFolderId(null);
                    }
                }} className="w-full py-6 text-rose-400 font-black text-[10px] uppercase tracking-[0.4em] hover:text-rose-600 transition-colors">Xóa vĩnh viễn bộ sưu tập này</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- CSS TÙY CHỈNH --- */}
      <style jsx global>{`
        .perspective { perspective: 2000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .touch-none { touch-action: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}