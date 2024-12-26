import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from "axios";

//import FileUpload from './components/FileUpload'; // 導入 FileUpload 組件

const SERVER_IP='http://***********'

// 頁面: 登錄
const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // 登錄函數
  const handleLogin = () => {
    if (username === 'admin' && password === '1234') {
      navigate('/dashboard'); // 跳轉 Dashboard
    } else {
      alert('Invalid Username or Password');
    }
  };

  return (
    <div>
    <h2>Login Page</h2>
    <input
    type="text"
    placeholder="Username"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    />
    <br />
    <input
    type="password"
    placeholder="Password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    />
    <br />
    <button onClick={handleLogin}>Login</button>
    </div>
  );
};

// 通信: fetch
async function fetchData ( url ) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

// 通信: 自動加載 Dashboard data
const useDashboardData = (url) => {
  return useQuery({
    queryKey: ['dashboardData', url],
    queryFn: () => fetchData(url),
    refetchInterval: 10000, // 每 10 秒自動加載一次
  });
};

// 頁面: Dashboard
const DashboardPage = () => {
  const navigate = useNavigate();
  // get DashboardData
  // 把useDashboardData吐出的data賦值給 dashboardData
  const { data: dashboardData, isLoading, error } = useDashboardData(`${SERVER_IP}/api/dashboard_data`);
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  
  const handlePageUpload = () => {
    navigate('/upload');
  };

  return (
    <div>
    <button onClick={handlePageUpload}>Upload Executable File</button>
    {dashboardData.map((item, index) => (
      <DashboardComponent key={index} data={item} />
    ))}
    </div>
  );
};

// dashboard_component 組件
const DashboardComponent = ({ data }) => {

  const [inputs, setInputs] = useState(Array(data.inputNum).fill(''));
  const [output, setOutput] = useState(''); // 用於展示輸出內容

  // 改變 inputs 的值
  const handleInputChange = (index, value) => {
    const newInputs = [...inputs];
    newInputs[index] = value;
    setInputs(newInputs);
  };

  // 在這裡組裝給伺服器運算的內容
  const handleCompute = async () => {
    const json_data = {
      executableName: data.executableName,
      input: inputs
    };

    try {
      const res = await postData(`${SERVER_IP}/api/compute`, json_data);
      setOutput(res.output);
    } catch (error) {
      console.error('Compute Error:', error);
      setOutput('Error occurred');
    }
  };


  return (
    <div>
    <h2>{data.title}</h2>
    {data.inputType.map((type, i) => (
      <div key={i}>
      {type === 'Text' && (
        <>
        <label>Input {i + 1}: </label>
        <input
        type="text"
        value={inputs[i]}
        onChange={(e) => handleInputChange(i, e.target.value)}
        />
        </>
      )}
      </div>
    ))}
    <button onClick={handleCompute}>Compute</button>
    <div>
    <span>Output: {output}</span>
    </div>
    </div>
  );
};


// 通信: 上傳json數據
const postData = async (url, newData) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // 定義數據類行為json
    body: JSON.stringify(newData),
  });
  if (!response.ok) {
    throw new Error('Failed to post data');
  }
  return response.json();
};


// 頁面: 文件上傳頁面
const UploadPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [inputs, setInputs] = useState([]);
  const [title, setTitle] = useState('');
  const [executableName, setExecutable] = useState('');

  // 設定 mutation 並設定更新後重新拉取數據
  /*
  const mutation = useMutation(({ url, newData }) => postData(url, newData), {
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboardData']); // 更新數據後重新拉取
    },
  });
*/
const mutation = useMutation({
    mutationFn: ({url, newData}) => postData(url, newData),
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboardData']);
    },
  });


  // 傳輸資料到伺服器
  const handleClick = () => {
    const newData = {
    title: title,
    executableName: executableName,
    inputNum: inputs.length,
    inputType: inputs,
    outputNum: "1",
    outputType: ["Text"]
  };

    // 傳輸newData到指定的API
    mutation.mutate({ url: `${SERVER_IP}/api/dashboard_data`, newData });
  };


  return (
    <div>
    <button
      onClick={ () => navigate('/dashboard')}
    >
    Go back
    </button>
    <br/>
    <h1>Info Upload</h1>
    <label>Title: </label>
    <input
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
    />
    <br/>
    <label>Executable File Name: </label>
    <input
      type="text"
      value={executableName}
        onChange={(e) => setExecutable(e.target.value)}
    />
    <br/>
    <label>Input type and Num</label>
    <br/>
    {inputs.map ((input, i) => (
      <input
        key={i}
        type="text"
        value={input}
        onChange={(e) => {
        const updatedInputs = [...inputs];
        updatedInputs[i] = e.target.value;
        setInputs(updatedInputs);
      }}
      />
    ))}
    <br/>
    <button
      onClick={ () => setInputs([...inputs, "Text"])}
    >
      Add Input Box
    </button>
    <br/>

    <button onClick={handleClick} disabled={mutation.isLoading}> {/*避免當數據在處理時重複提交*/}
      {mutation.isLoading ? 'Sending...' : 'Send Data'}
    </button>
    <FileUpload url={`${SERVER_IP}/api/upload_executable_file`} />
    </div>
  );
};

// 文件上傳按鈕
const FileUpload = ({ url }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setMessage(response.data.message);
    } catch (error) {
      setMessage("Failed to upload file: " + error.message);
    }
  };

  return (
    <div>
    <h1>File Upload</h1>
    <input type="file" onChange={handleFileChange} />
    <button onClick={handleUpload}>Upload</button>
    <p>{message}</p>
    </div>
  );
};


// 錯誤的網址回應
const NotFound = () => <div>404 Page, Error URL</div>;

export default function App() {

  return (
    <div>
    <Router>
    <Routes>
    <Route path="/" element={<LoginPage url={SERVER_IP} />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/upload" element={<UploadPage />} />
    <Route path="*" element={<NotFound />} /> {/* 匹配所有未定義路徑 */}
    </Routes>
    </Router>
    </div>
  );
}

