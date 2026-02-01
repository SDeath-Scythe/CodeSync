import React, { useState } from 'react';
import { Radio, Eye, Hand, MessageSquare, Sparkles } from 'lucide-react';
import { useToast } from '../ToastProvider';

const StudentControls = ({ mode = 'student' }) => {
        const isTeacher = mode === 'teacher';
        const [handRaised, setHandRaised] = useState(false);
        const toast = useToast();

        const handleRaiseHand = () => {
                if (isTeacher) {
                        toast.info('Broadcasting', 'Broadcasting your code to all students...');
                        return;
                }
                
                setHandRaised(!handRaised);
                toast.info(
                        handRaised ? 'Hand Lowered' : 'Hand Raised',
                        handRaised ? 'The teacher will no longer see your raised hand' : 'The teacher has been notified'
                );
        };

        const handleViewBoard = () => {
                if (isTeacher) {
                        toast.info('Peek Mode', 'Select a student to view their code in real-time');
                } else {
                        toast.success('Viewing Board', "Now synced with teacher's code view");
                }
        };

        const handleChat = () => {
                toast.info('Chat', 'Opening chat panel...');
        };

        return (
                <div className="p-3 bg-zinc-900/80 backdrop-blur-sm border-t border-zinc-700/50 flex flex-col gap-2">

                        <button 
                                onClick={handleRaiseHand}
                                className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                                        isTeacher 
                                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/25' 
                                                : handRaised
                                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/25 animate-pulse'
                                                        : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/25'
                                }`}
                        >
                                {isTeacher ? (
                                        <>
                                                <Radio className="w-4 h-4" /> 
                                                Broadcast Code
                                                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                                        </>
                                ) : (
                                        <>
                                                <Hand className={`w-4 h-4 ${handRaised ? 'animate-bounce' : ''}`} /> 
                                                {handRaised ? 'Hand Raised!' : 'Raise Hand'}
                                        </>
                                )}
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                                <button 
                                        onClick={handleViewBoard}
                                        className="bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-700/50 hover:border-indigo-500/30 transition-all hover:shadow-lg hover:shadow-indigo-500/10"
                                >
                                        <Eye className="w-3.5 h-3.5 text-indigo-400" /> 
                                        {isTeacher ? "Peek Student" : "View Board"}
                                </button>
                                <button 
                                        onClick={handleChat}
                                        className="bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-700/50 hover:border-indigo-500/30 transition-all hover:shadow-lg hover:shadow-indigo-500/10 relative"
                                >
                                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> 
                                        Chat
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">3</span>
                                </button>
                        </div>

                </div>
        );
};

export default StudentControls;