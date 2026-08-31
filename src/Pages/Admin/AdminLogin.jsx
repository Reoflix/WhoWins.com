import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import "./adminLogin.css";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Check whether logged-in user is an admin
    const { data: isAdmin, error: adminError } =
      await supabase.rpc("is_admin");

    if (adminError || !isAdmin) {
      await supabase.auth.signOut();

      setError(
        "Ye account Admin nahi hai."
      );

      setLoading(false);
      return;
    }

    navigate("/admin/dashboard");
  }

  return (
    <div className="admin-login-page">

      <div className="admin-login-card">

        <div className="admin-login-logo">
          👑
        </div>

        <span className="admin-login-brand">
          TOONVERSE
        </span>

        <h1>Admin Login</h1>

        <p>
          Sign in to access the control panel.
        </p>


        <form onSubmit={handleLogin}>

          <label>
            Email

            <input
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </label>


          <label>
            Password

            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />
          </label>


          {error && (
            <div className="admin-login-error">
              {error}
            </div>
          )}


          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "SIGNING IN..."
              : "SIGN IN"}

            {!loading && <span>→</span>}
          </button>

        </form>


        <button
          className="back-home-btn"
          onClick={() => navigate("/")}
        >
          ← Back to ToonVerse
        </button>

      </div>

    </div>
  );
}

export default AdminLogin;