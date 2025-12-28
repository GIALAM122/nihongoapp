import { useState, useEffect, useMemo, useRef } from "react";

const STORAGE_KEY = "jp_quizlet_data";

export default function MiniQuizlet() {
  // --- STATE ---
  const [cards, setCards] = useState([]);
  const [mode, setMode] = useState("flashcard");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Quiz State
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizPool, setQuizPool] = useState([]); // Chứa danh sách câu hỏi đã trộn
  const [quizLimit, setQuizLimit] = useState(0); // Giới hạn số câu hỏi người dùng chọn

  // Form State
  const [inputTerm, setInputTerm] = useState("");
  const [inputDef, setInputDef] = useState("");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  
  const fileInputRef = useRef(null);

  // --- INIT & SAVE ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCards(JSON.parse(saved));
    else setCards([
      { id: 1, term: "猫 (ねこ)", definition: "Con mèo" },
      { id: 2, term: "学生 (がくせい)", definition: "Học sinh" },
      { id: 3, term: "先生 (せんせい)", definition: "Giáo viên" },
      { id: 4, term: "日本語 (にほんご)", definition: "Tiếng Nhật" },
      { id: 5, term: "ありがとう", definition: "Cảm ơn" },
    ]);
  }, []);

  useEffect(() => {
    if (cards.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  // --- LOGIC FUNCTIONS ---
  
  // Flashcard Logic
  const handleNextCard = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex((prev) => (prev + 1) % cards.length), 150); };
  const handlePrevCard = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length), 150); };
  
  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Quiz Logic
  const startQuiz = (limit) => {
    const shuffledPool = [...cards].sort(() => Math.random() - 0.5);
    const actualLimit = limit === -1 ? cards.length : Math.min(limit, cards.length);
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
    
    // Tạo đáp án nhiễu từ toàn bộ danh sách cards (không chỉ trong pool)
    const otherCards = cards.filter(c => c.id !== currentCard.id);
    const shuffledOthers = [...otherCards].sort(() => 0.5 - Math.random());
    const wrongAnswers = shuffledOthers.slice(0, 3).map(c => c.definition);
    const allAnswers = [...wrongAnswers, currentCard.definition].sort(() => 0.5 - Math.random());
    
    return { question: currentCard.term, correctAnswer: currentCard.definition, answers: allAnswers };
  }, [quizPool, currentQuizIndex, quizFinished]);

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

  const resetQuiz = () => { 
    setQuizPool([]); 
    setQuizLimit(0); 
  };

  // CRUD & Import/Export
  const addCard = () => {
    if (!inputTerm || !inputDef) return;
    setCards([...cards, { id: Date.now(), term: inputTerm, definition: inputDef }]);
    setInputTerm(""); setInputDef("");
  };

  const deleteCard = (id) => {
    if (confirm("Xoá thẻ này?")) {
      const newCards = cards.filter(c => c.id !== id);
      setCards(newCards);
      if (newCards.length === 0) { localStorage.removeItem(STORAGE_KEY); setCurrentIndex(0); }
    }
  };

  const clearAllCards = () => {
    if (confirm("Bạn có chắc chắn muốn XOÁ TOÀN BỘ danh sách?")) {
      setCards([]); localStorage.removeItem(STORAGE_KEY); setCurrentIndex(0); setCurrentQuizIndex(0);
    }
  };

  const handleExportToFile = () => {
    if (cards.length === 0) return alert("Không có dữ liệu để xuất!");
    const content = cards.map(c => `${c.term} | ${c.definition}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nihongo_quizlet_${new Date().toLocaleDateString()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      return { id: Date.now() + Math.random(), term: parts[0].trim(), definition: parts.slice(1).join(" ").trim() };
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
        <h1 className="text-2xl font-bold text-[#4255FF] flex items-center gap-2">🇯🇵 Nihongo Quizlet</h1>
        <nav className="flex bg-white p-1 rounded-lg shadow-sm mt-4 md:mt-0">
          {[{ id: 'flashcard', label: 'Flashcards' }, { id: 'quiz', label: 'Kiểm tra' }, { id: 'edit', label: 'Danh sách' }].map(tab => (
            <button key={tab.id} onClick={() => { setMode(tab.id); resetQuiz(); setIsFlipped(false); }}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${mode === tab.id ? "bg-[#4255FF] text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto">
        {/* MODE: FLASHCARD */}
        {mode === 'flashcard' && cards.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="w-full flex justify-end mb-4">
               <button onClick={shuffleCards} className="text-sm font-bold text-[#4255FF] bg-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-50 transition-colors">🔀 Trộn thứ tự thẻ</button>
            </div>
            <div className="relative w-full h-80 cursor-pointer perspective" onClick={() => setIsFlipped(!isFlipped)}>
              <div className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
                <div className="absolute inset-0 bg-white border-2 border-slate-200 rounded-xl shadow-lg flex items-center justify-center backface-hidden">
                  <span className="text-4xl font-medium text-slate-700">{cards[currentIndex].term}</span>
                </div>
                <div className="absolute inset-0 bg-white border-2 border-[#4255FF] rounded-xl shadow-lg flex items-center justify-center rotate-y-180 backface-hidden">
                  <span className="text-2xl md:text-3xl text-[#4255FF] px-4 text-center">{cards[currentIndex].definition}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-8">
              <button onClick={handlePrevCard} className="p-3 rounded-full bg-white shadow hover:bg-slate-50">← Prev</button>
              <span className="font-bold text-slate-400">{currentIndex + 1} / {cards.length}</span>
              <button onClick={handleNextCard} className="p-3 rounded-full bg-white shadow hover:bg-slate-50">Next →</button>
            </div>
          </div>
        )}

        {/* MODE: QUIZ */}
        {mode === 'quiz' && (
          <div className="bg-white p-6 rounded-xl shadow-md min-h-[400px]">
            {cards.length < 4 ? (
              <div className="text-center py-20 text-slate-500">Cần ít nhất 4 thẻ để tạo bài kiểm tra.</div>
            ) : quizPool.length === 0 ? (
              /* Chọn giới hạn câu hỏi */
              <div className="text-center py-10">
                <h3 className="text-xl font-bold mb-6 text-slate-700">Chọn số lượng câu hỏi</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[5, 10, 20, -1].map((num) => (
                    <button 
                      key={num} 
                      onClick={() => startQuiz(num)}
                      className="p-4 bg-slate-50 border-2 border-slate-100 rounded-xl hover:border-[#4255FF] hover:bg-blue-50 font-bold transition-all"
                    >
                      {num === -1 ? "Tất cả" : num}
                    </button>
                  ))}
                </div>
                <p className="mt-6 text-slate-400 text-sm italic">Hệ thống sẽ trộn câu hỏi ngẫu nhiên từ danh sách của bạn.</p>
              </div>
            ) : !quizFinished ? (
              /* Đang làm Quiz */
              <div>
                <div className="flex justify-between items-center text-sm text-slate-400 mb-6">
                  <div className="bg-slate-100 px-3 py-1 rounded-full">Câu {currentQuizIndex + 1} / {quizLimit}</div>
                  <div className="font-bold text-[#4255FF]">Điểm: {quizScore}</div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mb-8 overflow-hidden">
                   <div className="bg-[#4255FF] h-full transition-all duration-300" style={{ width: `${((currentQuizIndex + 1) / quizLimit) * 100}%` }}></div>
                </div>
                <h2 className="text-3xl text-center font-bold py-6">{currentQuizData?.question}</h2>
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
              /* Kết thúc Quiz */
              <div className="text-center py-10">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold">Hoàn thành bài kiểm tra!</h2>
                <p className="text-4xl font-black text-[#4255FF] my-4">{quizScore} / {quizLimit}</p>
                <p className="text-slate-500 mb-8">Bạn đạt được {Math.round((quizScore/quizLimit)*100)}% số câu trả lời đúng.</p>
                <button onClick={resetQuiz} className="px-8 py-3 bg-[#4255FF] text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-colors">Làm bài mới</button>
              </div>
            )}
          </div>
        )}

        {/* MODE: EDIT (Giữ nguyên) */}
        {mode === 'edit' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50 border-b">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Thêm thẻ mới</h3>
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
              <h3 className="font-bold text-slate-700">Danh sách ({cards.length})</h3>
              {cards.length > 0 && (
                <div className="flex gap-2">
                  <button onClick={handleExportToFile} className="text-xs font-bold text-slate-600 px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 flex items-center gap-1">
                    💾 Xuất File .txt
                  </button>
                  <button onClick={clearAllCards} className="text-xs font-bold text-red-500 px-3 py-1.5 rounded border border-red-200 hover:bg-red-50">
                    🗑 Xoá sạch
                  </button>
                </div>
              )}
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {cards.map((card, index) => (
                <div key={card.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div className="flex gap-4 items-center">
                    <span className="text-slate-300 text-sm font-bold">{index + 1}</span>
                    <span className="font-medium text-slate-800">{card.term}</span>
                    <span className="text-slate-500">— {card.definition}</span>
                  </div>
                  <button onClick={() => deleteCard(card.id)} className="text-slate-300 hover:text-red-500 px-2 transition-colors">✕</button>
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
