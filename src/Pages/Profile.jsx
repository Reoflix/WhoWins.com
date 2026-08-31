import { useNavigate } from "react-router-dom";
import "./profile.css";

function Profile() {
  const navigate = useNavigate();

  const isLoggedIn = false;

  if (!isLoggedIn) {
    return (
      <div className="profile-page">

        <header className="profile-header">
          <button onClick={() => navigate("/")}>
            ←
          </button>

          <div>
            <h1>Profile</h1>
            <span>TOONVERSE ACCOUNT</span>
          </div>

          <div className="profile-header-space"></div>
        </header>


        <main className="profile-login-content">

          <div className="profile-avatar-large">
            ●
          </div>

          <h2>
            Welcome to ToonVerse
          </h2>

          <p>
            Login to save your votes, track battles,
            follow characters and build your profile.
          </p>

          <button
            className="profile-login-btn"
            onClick={() => navigate("/login")}
          >
            LOGIN / REGISTER
            <span>→</span>
          </button>


          <div className="profile-benefits">

            <div>
              <span>♥</span>
              <div>
                <strong>Save Your Votes</strong>
                <small>Keep your voting history</small>
              </div>
            </div>

            <div>
              <span>🏆</span>
              <div>
                <strong>Track Rankings</strong>
                <small>Follow your favorite characters</small>
              </div>
            </div>

            <div>
              <span>⚡</span>
              <div>
                <strong>Join Battles</strong>
                <small>Become part of the community</small>
              </div>
            </div>

          </div>

        </main>


        <nav className="profile-nav">

          <div onClick={() => navigate("/")}>
            <span>⌂</span>
            <small>Home</small>
          </div>

          <div onClick={() => navigate("/tournaments")}>
            <span>♜</span>
            <small>Tournaments</small>
          </div>

          <div onClick={() => navigate("/characters")}>
            <span>♡</span>
            <small>Characters</small>
          </div>

          <div onClick={() => navigate("/polls")}>
            <span>▥</span>
            <small>Polls</small>
          </div>

          <div className="active">
            <span>●</span>
            <small>Profile</small>
          </div>

        </nav>

      </div>
    );
  }

  return (
    <div className="profile-page">

      <header className="profile-header">

        <button onClick={() => navigate("/")}>
          ←
        </button>

        <div>
          <h1>My Profile</h1>
          <span>TOONVERSE MEMBER</span>
        </div>

        <button>
          ⚙
        </button>

      </header>


      <main className="profile-content">

        <section className="user-card">

          <div className="user-avatar">
            U
          </div>

          <h2>
            ToonVerse User
          </h2>

          <span>
            @toonverse_user
          </span>

          <div className="user-stats">

            <div>
              <strong>0</strong>
              <small>Votes</small>
            </div>

            <div>
              <strong>0</strong>
              <small>Battles</small>
            </div>

            <div>
              <strong>0</strong>
              <small>Polls</small>
            </div>

          </div>

        </section>


        <section className="profile-menu">

          <button>
            <span>♥</span>
            <div>
              <strong>My Votes</strong>
              <small>View your voting history</small>
            </div>
            <b>→</b>
          </button>

          <button>
            <span>⚡</span>
            <div>
              <strong>Battle History</strong>
              <small>Your daily battles</small>
            </div>
            <b>→</b>
          </button>

          <button>
            <span>▥</span>
            <div>
              <strong>Poll History</strong>
              <small>Polls you participated in</small>
            </div>
            <b>→</b>
          </button>

          <button>
            <span>♡</span>
            <div>
              <strong>Favorites</strong>
              <small>Your favorite characters</small>
            </div>
            <b>→</b>
          </button>

        </section>

      </main>

    </div>
  );
}

export default Profile;