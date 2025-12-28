import { useState, useEffect, useMemo, useRef } from "react";

const STORAGE_KEY = "jp_quizlet_data";
const FOLDER_KEY = "jp_quizlet_folders"; // Key mới cho folders

export default function MiniQuizlet() {
  // --- STATE ---
  const [cards, setCards] = useState([]);
  const [folders, setFolders] = useState([{ id: "default", name: "Mặc định" }]);
  const [activeFolderId, setActiveFolderId] = useState("default");
  const [newFolderName, setNewFolderName] = useState("");
  
  const [mode, setMode] = useState("flashcard");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Quiz State
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizPool, setQuizPool] = useState([]); 
  const [quizLimit, setQuizLimit] = useState(0); 

  // Game State
  const [gameCards, setGameCards] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [firstSelection, setFirstSelection] = useState(null);

  // Form State
  const [inputTerm, setInputTerm] = useState("");
  const [inputDef, setInputDef] = useState("");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  
  const fileInputRef = useRef(null);

  // --- INIT & SAVE ---
  useEffect(() => {
    const savedCards = localStorage.getItem(STORAGE_KEY);
    const savedFolders = localStorage.getItem(FOLDER_KEY);
    
    if (savedFolders) setFolders(JSON.parse(savedFolders));
    if (savedCards) {
        // Migration: Nếu card cũ chưa có folderId, gán vào 'default'
        const parsedCards = JSON.parse(savedCards).map(c => c.folderId ? c : {...c, folderId: 'default'});
        setCards(parsedCards);
    } else {
        setCards([
            { id: 1, term: "猫 (ねこ)", definition: "Con mèo", folderId: "default" },
            { id: 2, term: "学生 (gaku sei)", definition: "Học sinh", folderId: "default" },
        ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
  }, [folders]);

  // --- FILTERED DATA ---
  // Chỉ lấy những thẻ thuộc bộ bài đang chọn
  const currentFolderCards = useMemo(() => {
    return cards.filter(c => c.folderId === activeFolderId);
  }, [cards, activeFolderId]);

  // --- LOGIC FUNCTIONS ---
  
  // Quản lý Folder
  const addFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder = { id: Date.now().toString(), name: newFolderName };
    setFolders([...folders, newFolder]);
    setNewFolderName("");
    setActiveFolderId(newFolder.id);
    setCurrentIndex(0);
  };

  const deleteFolder = (id) => {
    if (id === 'default') return alert("Không thể xoá bộ mặc định");
    if (confirm("Xoá bộ bài này sẽ xoá tất cả thẻ bên trong?")) {
        setCards(cards.filter(c => c.folderId !== id));
        setFolders(folders.filter(f => f.id !== id));
        setActiveFolderId('default');
    }
  };

  // Audio Logic
  const speakJP = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Flashcard Logic
  const handleNextCard = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex((prev) => (prev + 1) % currentFolderCards.length), 150); };
  const handlePrevCard = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex((prev) => (prev - 1 + currentFolderCards.length) % currentFolderCards.length), 150); };
  
  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Quiz Logic
  const startQuiz = (limit) => {
    const shuffledPool = [...currentFolderCards].sort(() => Math.random() - 0.5);
    const actualLimit = limit === -1 ? currentFolderCards.length : Math.min(limit, currentFolderCards.length);
    setQuizPool(shuffledPool.slice(0, actualLimit));
    setQuizLimit(actualLimit);
    setQuizFinished(false);
    setQuizScore(0);
    setCurrentQuizIndex(0);
    setSelectedAnswer(null);
  };

  const currentQuizData = useMemo(() => {
    if (quizPool.length === 0 || quizFinished) return null;
    const currentCard = quizPool[currentQuizIndex];
    const otherCards = currentFolderCards.filter(c => c.id !== currentCard.id);
    const shuffledOthers = [...otherCards].sort(() => 0.5 - Math.random());
    const wrongAnswers = shuffledOthers.slice(0, 3).map(c => c.definition);
    const allAnswers = [...wrongAnswers, currentCard.definition].sort(() => 0.5 - Math.random());
    return { question: currentCard.term, correctAnswer: currentCard.definition, answers: allAnswers };
  }, [quizPool, currentQuizIndex, quizFinished, currentFolderCards]);

  const handleAnswerClick = (ans) => {
    if (selectedAnswer) return;
    setSelectedAnswer(ans);
    if (ans === currentQuizData.correctAnswer) setQuizScore(prev => prev + 1);
    
    setTimeout(() => {
      if (currentQuizIndex < quizPool.length - 1) { 
        setCurrentQuizIndex(prev => prev + 1); 
        setSelectedAnswer(null); 
      } else { 
        setQuizFinished(true); 
      }
    }, 1000);
  };

  const resetQuiz = () => { setQuizPool([]); setQuizLimit(0); };

  // Game Match Logic
  const startMatchGame = () => {
    const shuffled = [...currentFolderCards].sort(() => 0.5 - Math.random()).slice(0, 6);
    const terms = shuffled.map(c => ({ id: c.id, text: c.term, type: 'term', matched: false }));
    const defs = shuffled.map(c => ({ id: c.id, text: c.definition, type: 'def', matched: false }));
    setGameCards([...terms, ...defs].sort(() => 0.5 - Math.random()));
    setGameActive(true);
    setGameTime(0);
    setFirstSelection(null);
  };

  useEffect(() => {
    let timer;
    if (gameActive) timer = setInterval(() => setGameTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [gameActive]);

  const handleGameCardClick = (card, index) => {
    if (card.matched || (firstSelection && firstSelection.uniqueId === index)) return;
    if (card.type === 'term') speakJP(card.text);

    if (!firstSelection) {
      setFirstSelection({ ...card, uniqueId: index });
    } else {
      if (firstSelection.id === card.id && firstSelection.type !== card.type) {
        setGameCards(prev => prev.map((c, i) => (c.id === card.id) ? { ...c, matched: true } : c));
        setFirstSelection(null);
      } else {
        setFirstSelection({ ...card, uniqueId: index });
        setTimeout(() => setFirstSelection(null), 300);
      }
    }
  };

  useEffect(() => {
    if (gameActive && gameCards.length > 0 && gameCards.every(c => c.matched)) setGameActive(false);
  }, [gameCards, gameActive]);

  // CRUD & Import/Export
  const addCard = () => {
    if (!inputTerm || !inputDef) return;
    setCards([...cards, { id: Date.now(), term: inputTerm, definition: inputDef, folderId: activeFolderId }]);
    setInputTerm(""); setInputDef("");
  };

  const deleteCard = (id) => {
    if (confirm("Xoá thẻ này?")) {
      setCards(cards.filter(c => c.id !== id));
      if (currentIndex >= currentFolderCards.length - 1) setCurrentIndex(0);
    }
  };

  const clearAllCards = () => {
    if (confirm("Xoá TOÀN BỘ thẻ trong bộ này?")) {
        setCards(cards.filter(c => c.folderId !== activeFolderId));
        setCurrentIndex(0);
    }
  };

  const handleExportToFile = () => {
    if (currentFolderCards.length === 0) return alert("Không có dữ liệu!");
    const content = currentFolderCards.map(c => `${c.term} | ${c.definition}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `folder_${activeFolderId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { setImportText(event.target.result); setShowImport(true); };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleBulkImport = () => {
    if (!importText.trim()) return;
    const lines = importText.split("\n");
    const newCards = lines.map((line) => {
      let parts = line.includes("|") ? line.split("|") : line.split("-");
      if (parts.length < 2) return null;
      return { id: Date.now() + Math.random(), term: parts[0].trim(), definition: parts.slice(1).join(" ").trim(), folderId: activeFolderId };
    }).filter(Boolean);

    if (newCards.length > 0) {
      setCards([...cards, ...newCards]);
      setImportText(""); setShowImport(false);
      alert(`Đã nhập thành công ${newCards.length} thẻ!`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-slate-800 font-sans p-4 md:p-8">
      <header className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-[#4255FF] flex items-center gap-2">🇯🇵 Nihongo Quizlet by HGL</h1>
        <nav className="flex bg-white p-1 rounded-lg shadow-sm mt-4 md:mt-0 overflow-x-auto max-w-full">
          {[
            { id: 'flashcard', label: 'Flashcards' }, 
            { id: 'quiz', label: 'Kiểm tra' }, 
            { id: 'game', label: 'Trò chơi' }, 
            { id: 'edit', label: 'Danh sách' }
          ].map(tab => (
            <button key={tab.id} onClick={() => { setMode(tab.id); resetQuiz(); setIsFlipped(false); setGameActive(false); }}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${mode === tab.id ? "bg-[#4255FF] text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* SECTION: FOLDER MANAGER */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-xl shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase ml-2">Bộ bài:</span>
            {folders.map(f => (
                <div key={f.id} className="group relative">
                    <button onClick={() => {setActiveFolderId(f.id); setCurrentIndex(0);}}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${activeFolderId === f.id ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                        {f.name}
                    </button>
                    {f.id !== 'default' && (
                        <button onClick={() => deleteFolder(f.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] hidden group-hover:flex items-center justify-center">✕</button>
                    )}
                </div>
            ))}
            <div className="flex gap-1 ml-auto">
                <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Tên bộ mới..." className="text-sm border rounded-full px-3 py-1 outline-none focus:border-[#4255FF]" />
                <button onClick={addFolder} className="bg-[#4255FF] text-white rounded-full px-3 py-1 text-sm">+</button>
            </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto">
        {/* MODE: FLASHCARD */}
        {mode === 'flashcard' && (
            currentFolderCards.length > 0 ? (
                <div className="flex flex-col items-center">
                    <div className="w-full flex justify-end mb-4 gap-2">
                        <button onClick={() => speakJP(currentFolderCards[currentIndex].term)} className="text-sm font-bold text-slate-600 bg-white px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">🔊 Nghe</button>
                        <button onClick={shuffleCards} className="text-sm font-bold text-[#4255FF] bg-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-50 transition-colors">🔀 Trộn thẻ</button>
                    </div>
                    <div className="relative w-full h-80 cursor-pointer perspective" 
                        onClick={() => { 
                            if(!isFlipped) speakJP(currentFolderCards[currentIndex].term);
                            setIsFlipped(!isFlipped); 
                        }}>
                    <div className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
                        <div className="absolute inset-0 bg-white border-2 border-slate-200 rounded-xl shadow-lg flex items-center justify-center backface-hidden">
                        <span className="text-4xl font-medium text-slate-700">{currentFolderCards[currentIndex].term}</span>
                        </div>
                        <div className="absolute inset-0 bg-white border-2 border-[#4255FF] rounded-xl shadow-lg flex items-center justify-center rotate-y-180 backface-hidden">
                        <span className="text-2xl md:text-3xl text-[#4255FF] px-4 text-center">{currentFolderCards[currentIndex].definition}</span>
                        </div>
                    </div>
                    </div>
                    <div className="flex items-center gap-6 mt-8">
                    <button onClick={handlePrevCard} className="p-3 rounded-full bg-white shadow hover:bg-slate-50">← Prev</button>
                    <span className="font-bold text-slate-400">{currentIndex + 1} / {currentFolderCards.length}</span>
                    <button onClick={handleNextCard} className="p-3 rounded-full bg-white shadow hover:bg-slate-50">Next →</button>
                    </div>
                </div>
            ) : <div className="text-center py-20 bg-white rounded-xl">Bộ bài này trống. Hãy sang mục "Danh sách" để thêm thẻ!</div>
        )}

        {/* MODE: QUIZ */}
        {mode === 'quiz' && (
          <div className="bg-white p-6 rounded-xl shadow-md min-h-[400px]">
            {currentFolderCards.length < 4 ? (
              <div className="text-center py-20 text-slate-500">Cần ít nhất 4 thẻ trong bộ này để làm bài kiểm tra.</div>
            ) : quizPool.length === 0 ? (
              <div className="text-center py-10">
                <h3 className="text-xl font-bold mb-6 text-slate-700">Kiểm tra bộ: {folders.find(f => f.id === activeFolderId)?.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[5, 10, 20, -1].map((num) => (
                    <button key={num} onClick={() => startQuiz(num)} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-xl hover:border-[#4255FF] hover:bg-blue-50 font-bold transition-all">
                      {num === -1 ? "Tất cả" : num}
                    </button>
                  ))}
                </div>
              </div>
            ) : !quizFinished ? (
              <div>
                <div className="flex justify-between items-center text-sm text-slate-400 mb-6">
                  <div className="bg-slate-100 px-3 py-1 rounded-full">Câu {currentQuizIndex + 1} / {quizLimit}</div>
                  <div className="font-bold text-[#4255FF]">Điểm: {quizScore}</div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mb-8 overflow-hidden">
                   <div className="bg-[#4255FF] h-full transition-all duration-300" style={{ width: `${((currentQuizIndex + 1) / quizLimit) * 100}%` }}></div>
                </div>
                <div className="flex flex-col items-center py-6">
                    <h2 className="text-3xl text-center font-bold mb-4">{currentQuizData?.question}</h2>
                    <button onClick={() => speakJP(currentQuizData?.question)} className="p-2 text-[#4255FF] hover:scale-110 transition-transform">🔊 Nghe phát âm</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuizData?.answers.map((ans, idx) => (
                    <button key={idx} disabled={!!selectedAnswer} onClick={() => handleAnswerClick(ans)}
                      className={`p-4 border-2 rounded-lg text-lg font-medium transition-all text-left ${selectedAnswer ? (ans === currentQuizData.correctAnswer ? "bg-green-100 border-green-500" : (ans === selectedAnswer ? "bg-red-100 border-red-500" : "opacity-50")) : "border-slate-200 hover:border-[#4255FF]"}`}>
                      {ans}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold">Hoàn thành bài kiểm tra!</h2>
                <p className="text-4xl font-black text-[#4255FF] my-4">{quizScore} / {quizLimit}</p>
                <button onClick={resetQuiz} className="px-8 py-3 bg-[#4255FF] text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-colors">Làm bài mới</button>
              </div>
            )}
          </div>
        )}

        {/* MODE: GAME */}
        {mode === 'game' && (
          <div className="bg-white p-6 rounded-xl shadow-md min-h-[450px]">
            {currentFolderCards.length < 3 ? (
              <div className="text-center py-20 text-slate-500">Cần ít nhất 3 thẻ để chơi.</div>
            ) : !gameActive && gameCards.length === 0 ? (
              <div className="text-center py-16">
                <h3 className="text-2xl font-bold mb-4">⚡ Ghép cặp nhanh</h3>
                <p className="text-slate-500 mb-8">Bộ đang chơi: {folders.find(f => f.id === activeFolderId)?.name}</p>
                <button onClick={startMatchGame} className="px-10 py-4 bg-[#4255FF] text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform">Bắt đầu trò chơi</button>
              </div>
            ) : !gameActive && gameCards.every(c => c.matched) ? (
              <div className="text-center py-16">
                <h2 className="text-3xl font-bold mb-2 text-[#4255FF]">{gameTime} giây!</h2>
                <button onClick={startMatchGame} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-lg">Chơi lại</button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6 text-slate-500 font-bold">
                  <span>Thời gian: {gameTime}s</span>
                  <button onClick={() => {setGameActive(false); setGameCards([])}} className="text-sm text-red-500">Hủy</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {gameCards.map((card, idx) => (
                    <button key={idx} onClick={() => handleGameCardClick(card, idx)}
                      className={`h-24 p-2 border-2 rounded-xl transition-all text-sm font-medium shadow-sm flex items-center justify-center text-center
                        ${card.matched ? "opacity-0 pointer-events-none" : "bg-white hover:border-[#4255FF]"}
                        ${firstSelection?.uniqueId === idx ? "border-[#4255FF] bg-blue-50" : "border-slate-100"}`}>
                      {card.text}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* MODE: EDIT */}
        {mode === 'edit' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50 border-b">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Thêm thẻ vào bộ: {folders.find(f => f.id === activeFolderId)?.name}</h3>
                <div className="flex gap-3">
                    <input type="file" accept=".txt" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current.click()} className="text-sm text-green-600 font-semibold hover:underline">📁 Nhập File</button>
                    <button onClick={() => setShowImport(!showImport)} className="text-sm text-[#4255FF] font-semibold hover:underline">{showImport ? "Đóng" : "+ Nhập Text"}</button>
                </div>
              </div>
              {showImport && (
                <div className="mb-6 animate-in fade-in duration-300">
                  <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Tiếng Nhật | Nghĩa tiếng Việt (mỗi từ 1 dòng)" className="w-full h-32 p-3 border rounded-md text-sm mb-2 focus:ring-2 focus:ring-[#4255FF] outline-none" />
                  <button onClick={handleBulkImport} className="w-full py-2 bg-[#4255FF] text-white font-bold rounded hover:bg-blue-700 transition-colors">Xác nhận Thêm</button>
                </div>
              )}
              <div className="flex flex-col md:flex-row gap-4">
                <input value={inputTerm} onChange={(e) => setInputTerm(e.target.value)} placeholder="Tiếng Nhật" className="flex-1 p-3 border rounded-md outline-none focus:ring-2 focus:ring-[#4255FF]" />
                <input value={inputDef} onChange={(e) => setInputDef(e.target.value)} placeholder="Nghĩa" className="flex-1 p-3 border rounded-md outline-none focus:ring-2 focus:ring-[#4255FF]" />
                <button onClick={addCard} className="px-6 py-3 bg-slate-800 text-white font-bold rounded-md hover:bg-black">Thêm</button>
              </div>
            </div>
            <div className="p-4 bg-white border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Danh sách ({currentFolderCards.length})</h3>
              {currentFolderCards.length > 0 && (
                <div className="flex gap-2">
                  <button onClick={handleExportToFile} className="text-xs font-bold text-slate-600 px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 flex items-center gap-1">💾 Xuất File</button>
                  <button onClick={clearAllCards} className="text-xs font-bold text-red-500 px-3 py-1.5 rounded border border-red-200 hover:bg-red-50">🗑 Xoá sạch bộ này</button>
                </div>
              )}
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {currentFolderCards.map((card, index) => (
                <div key={card.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div className="flex gap-4 items-center">
                    <span className="text-slate-300 text-sm font-bold">{index + 1}</span>
                    <span className="font-medium text-slate-800">{card.term}</span>
                    <span className="text-slate-500">— {card.definition}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => speakJP(card.term)} className="text-slate-300 hover:text-[#4255FF] px-2 transition-colors">🔊</button>
                    <button onClick={() => deleteCard(card.id)} className="text-slate-300 hover:text-red-500 px-2 transition-colors">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        .perspective { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}