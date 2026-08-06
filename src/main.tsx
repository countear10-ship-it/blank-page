import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import DecisionPage from './pages/DecisionPage';
import StoragePage from './pages/StoragePage';
import QuizPage from './pages/QuizPage';
import AboutPage from './pages/AboutPage';
import ScrollToTop from './components/ScrollToTop';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><HashRouter><ScrollToTop /><Routes><Route element={<Layout />}><Route path="/" element={<HomePage />} /><Route path="/map" element={<MapPage />} /><Route path="/decision" element={<DecisionPage />} /><Route path="/storage" element={<StoragePage />} /><Route path="/quiz" element={<QuizPage />} /><Route path="/about" element={<AboutPage />} /></Route></Routes></HashRouter></React.StrictMode>);
