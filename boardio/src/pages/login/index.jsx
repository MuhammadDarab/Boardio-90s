import { useState } from "react";
import "./index.css";
import { BACKEND_ADDRESS } from "../../utils/constants";
import { setToken } from "../../utils/auth";
import { playClickSound } from "../../utils/utility";

const Login = ({ router }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLogin() {
    if (!username || !password || loading) return;
    setLoading(true);
    setError("");
    fetch(BACKEND_ADDRESS + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(({ token }) => {
        setToken(token);
        playClickSound();
        router.push("/create-board");
      })
      .catch(() => {
        setError("Invalid username or password.");
        setLoading(false);
      });
  }

  return (
    <section>
      <div className="border-[0.5px] border-retro-green h-[70vh] retro-green py-12 px-16 m-24 bg-white absolute shadow-90s">
        <div className="text-[34px] font-black">Boardio</div>
        <div className="font-light text-[14px]">
          Your own personal 90's themed
          <br />
          ticket collaboration area!
        </div>
        <hr className="p-[0.25px] bg-[#696969] border-none mt-6" />
        <center className="mt-4 font-black text-[14px] mb-4">Sign in</center>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="border-[0.5px] border-retro-green shadow-90s-btn px-2 py-1 text-[14px] outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="border-[0.5px] border-retro-green shadow-90s-btn px-2 py-1 text-[14px] outline-none"
          />
          {error && (
            <div className="text-red-600 text-[12px] text-center">{error}</div>
          )}
          <div
            onClick={handleLogin}
            className="text-[14px] shadow-90s-btn border-[0.5px] border-retro-green px-[2px] py-2 flex justify-center items-center cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign in"}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
