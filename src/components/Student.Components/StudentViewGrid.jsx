import React from 'react';
import { Mic, MicOff, Hand, AlertTriangle, CheckCircle2, Crown } from 'lucide-react';

const PEERS = [
        { id: 1, name: "Sarah K.", role: "student", handRaised: true, status: "ok", avatar: "https://i.pravatar.cc/150?u=sarah" },
        { id: 2, name: "Alex R.", role: "student", handRaised: false, status: "error", avatar: "https://i.pravatar.cc/150?u=alex" },
        { id: 3, name: "Chloe M.", role: "student", handRaised: false, status: "synced", avatar: "https://i.pravatar.cc/150?u=chloe" },
        { id: 4, name: "Mike T.", role: "student", handRaised: false, status: "ok", avatar: "https://i.pravatar.cc/150?u=mike" },
];

const StudentVideoGrid = () => {
        return (
                <div className="flex flex-col gap-3 p-3">
                        {/* Active Speaker (Instructor) */}
                        <div className="relative aspect-video bg-zinc-900 rounded-xl overflow-hidden border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20 group">
                                <img src="https://i.pravatar.cc/150?u=davis" alt="Instructor" className="w-full h-full object-cover" />
                                
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                
                                {/* Speaking indicator ring */}
                                <div className="absolute inset-0 border-2 border-emerald-400 rounded-xl animate-pulse pointer-events-none" />
                                
                                <div className="absolute top-2 left-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1.5">
                                        <div className="relative">
                                                <div className="w-2 h-2 bg-white rounded-full" />
                                                <div className="w-2 h-2 bg-white rounded-full absolute inset-0 animate-ping" />
                                        </div>
                                        Speaking
                                </div>
                                
                                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-white font-semibold flex items-center gap-2">
                                                <Mic className="w-3 h-3 text-emerald-400" /> 
                                                Mr. Davis
                                                <span className="bg-indigo-500/30 text-indigo-300 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                                        <Crown className="w-2.5 h-2.5" /> HOST
                                                </span>
                                        </div>
                                </div>
                        </div>

                        {/* Peer Grid */}
                        <div className="grid grid-cols-2 gap-2">
                                {PEERS.map(peer => (
                                        <div key={peer.id} className="relative aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-zinc-700/50 hover:border-indigo-500/30 group transition-all hover:shadow-lg hover:shadow-indigo-500/10">
                                                <img src={peer.avatar} alt={peer.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                                
                                                {/* Gradient overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                                                <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] text-white font-medium">
                                                        {peer.name}
                                                </div>

                                                {peer.handRaised && (
                                                        <div className="absolute top-1.5 left-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg animate-bounce">
                                                                <Hand className="w-2.5 h-2.5" /> Hand Raised
                                                        </div>
                                                )}

                                                {peer.status === 'error' && (
                                                        <div className="absolute top-1.5 left-1.5 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                                                                <AlertTriangle className="w-2.5 h-2.5" /> Error
                                                        </div>
                                                )}

                                                {peer.status === 'synced' && (
                                                        <div className="absolute top-1.5 right-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                                                                <CheckCircle2 className="w-2.5 h-2.5" /> Synced
                                                        </div>
                                                )}
                                        </div>
                                ))}
                        </div>
                </div>
        );
};

export default StudentVideoGrid;