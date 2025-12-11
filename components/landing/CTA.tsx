"use client";
import React from "react";
import { motion } from "framer-motion";
import { HiArrowRight } from "react-icons/hi2";
import Link from "next/link";

export function LandingCTA() {
  return (
    <div className="w-full bg-black border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col md:flex-row justify-between items-center w-full md:px-8">
        <div className="flex flex-col">
            <motion.h2 className="text-white text-2xl text-center md:text-left md:text-3xl lg:text-4xl font-bold mx-auto md:mx-0 max-w-xl ">
            Start building with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Routstr</span> today.
            </motion.h2>
            <p className="max-w-md mt-4 text-center md:text-left text-base md:text-lg mx-auto md:mx-0 text-neutral-400">
            Join the decentralized AI revolution. Connect your models, earn Bitcoin, or build censorship-resistant AI apps.
            </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mt-8 md:mt-0">
            <Link href="/models" className="flex space-x-2 items-center group text-base px-6 py-3 rounded-lg bg-white text-black font-semibold shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] hover:bg-gray-200 transition-colors">
                <span>Explore Models</span>
                <HiArrowRight className="text-black group-hover:translate-x-1 stroke-[1px] h-3 w-3 mt-0.5 transition-transform duration-200" />
            </Link>
             <Link href="https://docs.routstr.com" className="flex space-x-2 items-center group text-base px-6 py-3 rounded-lg border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors">
                <span>Read Docs</span>
            </Link>
        </div>
        </div>
    </div>
  );
}


