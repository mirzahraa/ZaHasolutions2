import React, { useState, useEffect } from "react";
import axios from "axios";

const FEEDER_CODES = [
  "KHD01","PHR01","CHD03","WNB02","KHD02","KNR02","CHD01","BKP03","BWR03","PZN02",
  "KNR01","BGM03","BKP04","CHD04","RGR01","BGM02","BGM01","NGM01","BKP01","PZN03",
  "BWR01","CHD05","PMA05","CNP03","BKP05","KHD03","BKP02","NGM02","RGR02","KNR03",
  "PZN01","HNJ02","CHD06","0","CHD02","HNJ01","BKP33","CHD33","PHR33","CHD07",
  "NGM04","BDG33"
];
const DT_CAPACITIES = [
  "16kva", "25kva", "63kva", "100kva", "200kva", "250kva", "400kva", "500kva",
  "630kva", "750kva", "1000kva"
];
const CONSUMER_CODES = Array.from({length: 42000}, (_,i) => (206020000001+i).toString().padStart(13,'0'));

const api = axios.create({
  baseURL: "/api",
});

function Auth({ setToken }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    try {
      if (register) {
        await api.post("/register", { email, password: pw });
        setMsg("Registered. Please login.");
        setRegister(false);
      } else {
        const r = await api.post("/login", { email, password: pw });
        setToken(r.data.token);
      }
    } catch (e) {
      setMsg(e.response?.data?.error || "Error");
    }
  }
  return (
    <div style={{maxWidth:400,margin:"auto",marginTop:80,padding:24, background:"#eee", borderRadius:8}}>
      <h2>{register ? "Register" : "Login"}</h2>
      <form onSubmit={handleSubmit}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" required style={{width:"100%",marginBottom:8}}/>
        <input value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password" type="password" required style={{width:"100%",marginBottom:8}}/>
        <button style={{width:"100%"}}>{register ? "Register" : "Login"}</button>
        <div style={{marginTop:10}}>
          <span onClick={()=>setRegister(!register)} style={{color:"#349",cursor:"pointer"}}>
            {register ? "Already registered? Login" : "New user? Register"}
          </span>
        </div>
        <div style={{color:"red"}}>{msg}</div>
      </form>
    </div>
  );
}

function DTForm({token, onSubmit}) {
  const [feeder, setFeeder] = useState(FEEDER_CODES[0]);
  const [capacity, setCapacity] = useState(DT_CAPACITIES[0]);
  const [dtName, setDTName] = useState("");
  const [consumers, setConsumers] = useState(["0206020000001"]);
  function handleConsumerChange(i, v) {
    const arr = consumers.slice();
    arr[i] = v;
    setConsumers(arr);
  }
  function addConsumer() {
    if (consumers.length < 5) setConsumers([...consumers, ""]);
  }
  function removeConsumer(i) {
    if (consumers.length > 1) setConsumers(consumers.filter((_,ix)=>ix!==i));
  }
  async function submit(e) {
    e.preventDefault();
    if (!dtName) return;
    await api.post("/dtcodes", {
      feederCode: feeder,
      dtCapacity: capacity,
      dtName,
      consumerCodes: consumers,
    }, { headers: { Authorization: `Bearer ${token}` } });
    setDTName(""); setConsumers(["0206020000001"]);
    onSubmit();
  }
  return (
    <form onSubmit={submit} style={{background:"#f8f8f8",padding:16,borderRadius:8,marginBottom:24}}>
      <h3>Add New DT Code</h3>
      <label>Feeder Code:</label>
      <select value={feeder} onChange={e=>setFeeder(e.target.value)} required>
        {FEEDER_CODES.map(f=><option key={f}>{f}</option>)}
      </select>
      <br/>
      <label>DT Capacity:</label>
      <select value={capacity} onChange={e=>setCapacity(e.target.value)} required>
        {DT_CAPACITIES.map(c=><option key={c}>{c}</option>)}
      </select>
      <br/>
      <label>DT Name:</label>
      <input value={dtName} onChange={e=>setDTName(e.target.value)} required/>
      <br/>
      <label>Consumer Codes (up to 5):</label>
      {consumers.map((c,i)=>
        <span key={i} style={{display:"flex",alignItems:"center"}}>
          <select value={c} onChange={e=>handleConsumerChange(i,e.target.value)} style={{marginRight:6}}>
            {CONSUMER_CODES.map(code=><option key={code}>{code}</option>)}
          </select>
          {consumers.length > 1 && <button type="button" onClick={()=>removeConsumer(i)}>-</button>}
        </span>
      )}
      {consumers.length < 5 && <button type="button" onClick={addConsumer}>Add another</button>}
      <br/>
      <button type="submit" style={{marginTop:8}}>Submit</button>
    </form>
  );
}

function DTTable({data}) {
  return (
    <table border={1} cellPadding={5} style={{width:"100%",marginTop:16}}>
      <thead><tr>
        <th>#</th><th>Feeder Code</th><th>DT Capacity</th><th>DT Name</th><th>Consumer Codes</th><th>By</th><th>Date</th>
      </tr></thead>
      <tbody>
        {data.map((dt,i)=>
          <tr key={i}>
            <td>{i+1}</td>
            <td>{dt.feederCode}</td>
            <td>{dt.dtCapacity}</td>
            <td>{dt.dtName}</td>
            <td>{dt.consumerCodes.join(", ")}</td>
            <td>{dt.createdBy}</td>
            <td>{dt.createdAt?.slice(0,19).replace("T"," ")}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token")||"");
  const [dt, setDT] = useState([]);
  useEffect(()=>{
    if (token) {
      api.get("/dtcodes", { headers: { Authorization: `Bearer ${token}`}})
        .then(r=>setDT(r.data)).catch(()=>setToken(""));
    }
  },[token]);
  function refresh() {
    api.get("/dtcodes", { headers: { Authorization: `Bearer ${token}`}})
      .then(r=>setDT(r.data));
  }
  function logout() {
    setToken(""); localStorage.removeItem("token");
  }
  function download() {
    window.open("/api/dtcodes/export", "_blank");
  }
  useEffect(()=>{ if(token) localStorage.setItem("token",token); },[token]);
  if (!token) return <Auth setToken={setToken}/>;
  return (
    <div style={{maxWidth:900,margin:"auto",padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h2>KPDCL Electric Sub Division Chadoora: DT Code Creation</h2>
          <div style={{color:"#555",fontSize:14,marginBottom:8}}>
            Web Designer & Data Scientist: <b>Er. Rouf</b>
          </div>
        </div>
        <div>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
      <DTForm token={token} onSubmit={refresh}/>
      <button onClick={download}>Export Data (CSV)</button>
      <DTTable data={dt}/>
    </div>
  );
}