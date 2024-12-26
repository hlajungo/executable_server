import React, { StrictMode } from "react";
import ReactDOM from 'react-dom';

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
//import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import "./styles.css";
import App from "./App";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3, // 默認重試 3 次
      refetchOnWindowFocus: false, // 禁用窗口焦點重新加載
      refetchInterval: 0, // 禁用自動重新加載
    },
  },
});


const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
