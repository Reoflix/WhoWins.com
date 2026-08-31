import {
  useEffect,
  useState,
  useRef,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import { supabase } from "./lib/supabase";

import "./home.css";


function calculatePercent(
  leftVotes,
  rightVotes
) {
  const left = Number(leftVotes || 0);
  const right = Number(rightVotes || 0);

  const total = left + right;

  if (total === 0) {
    return {
      left: 50,
      right: 50,
    };
  }

  return {
    left: Math.round(
      (left / total) * 100
    ),

    right: Math.round(
      (right / total) * 100
    ),
  };
}


function formatTimeLeft(endDate) {

  if (!endDate) {
    return {
      hours: "00",
      minutes: "00",
      seconds: "00",
      ended: true,
    };
  }

  const difference =
    new Date(endDate).getTime() -
    Date.now();

  if (difference <= 0) {
    return {
      hours: "00",
      minutes: "00",
      seconds: "00",
      ended: true,
    };
  }

  const totalSeconds =
    Math.floor(difference / 1000);

  const hours =
    Math.floor(totalSeconds / 3600);

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  return {
    hours: String(hours).padStart(2, "0"),

    minutes: String(minutes).padStart(2, "0"),

    seconds: String(seconds).padStart(2, "0"),

    ended: false,
  };
}


function Home() {

  const navigate = useNavigate();


  /* ===============================
     SIDE MENU
  =============================== */

  const [menuOpen, setMenuOpen] =
    useState(false);


  /* ===============================
     SEARCH
  =============================== */

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResults, setSearchResults] =
    useState([]);

  const [searchLoading, setSearchLoading] =
    useState(false);


  /* ===============================
     BATTLES
  =============================== */

  const [battles, setBattles] =
    useState([]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [loadingBattle, setLoadingBattle] =
    useState(true);


  /* ===============================
     CHARACTERS
  =============================== */

  const [characters, setCharacters] =
    useState([]);

  const [
    loadingCharacters,
    setLoadingCharacters,
  ] = useState(true);


  /* ===============================
     TIMER
  =============================== */

  const [timeLeft, setTimeLeft] =
    useState({
      hours: "00",
      minutes: "00",
      seconds: "00",
      ended: false,
    });


  /* ===============================
     SWIPE
  =============================== */

  const touchStartX =
    useRef(null);


  /* ===============================
     LOAD LIVE BATTLES
  =============================== */

  useEffect(() => {
    fetchBattles();
  }, []);


  async function fetchBattles() {

    setLoadingBattle(true);

    try {

      const now =
        new Date().toISOString();

      const {
        data,
        error,
      } = await supabase
        .from("battles")
        .select(`
          *,
          left_character:left_character_id (
            id,
            name,
            image_url
          ),
          right_character:right_character_id (
            id,
            name,
            image_url
          )
        `)
        .eq("status", "live")
        .lte("starts_at", now)
        .gt("ends_at", now)
        .order("created_at", {
          ascending: false,
        });


      if (error) {

        console.error(
          "Home battle error:",
          error
        );

        setBattles([]);

      } else {

        setBattles(data || []);

        setCurrentIndex(0);
      }

    } catch (error) {

      console.error(
        "Unexpected battle error:",
        error
      );

      setBattles([]);

    } finally {

      setLoadingBattle(false);

    }
  }


  /* ===============================
     CURRENT BATTLE
  =============================== */

  const battle =
    battles[currentIndex] || null;


  /* ===============================
     COUNTDOWN
  =============================== */

  useEffect(() => {

    if (!battle) {
      return;
    }

    function updateTimer() {

      setTimeLeft(
        formatTimeLeft(
          battle.ends_at
        )
      );

    }

    updateTimer();

    const timer =
      setInterval(
        updateTimer,
        1000
      );

    return () =>
      clearInterval(timer);

  }, [battle]);


  /* ===============================
     NEXT BATTLE
  =============================== */

  function nextBattle() {

    if (battles.length <= 1) {
      return;
    }

    setCurrentIndex(
      (current) =>
        (current + 1) %
        battles.length
    );
  }


  /* ===============================
     PREVIOUS BATTLE
  =============================== */

  function previousBattle() {

    if (battles.length <= 1) {
      return;
    }

    setCurrentIndex(
      (current) =>
        current === 0
          ? battles.length - 1
          : current - 1
    );
  }


  /* ===============================
     TOUCH
  =============================== */

  function handleTouchStart(event) {

    touchStartX.current =
      event.touches[0].clientX;
  }


  function handleTouchEnd(event) {

    if (
      touchStartX.current === null
    ) {
      return;
    }

    const endX =
      event.changedTouches[0].clientX;

    const difference =
      touchStartX.current - endX;


    if (
      Math.abs(difference) > 50
    ) {

      if (difference > 0) {
        nextBattle();
      } else {
        previousBattle();
      }

    }

    touchStartX.current = null;
  }


  /* ===============================
     LOAD CHARACTERS
  =============================== */

  useEffect(() => {
    fetchCharacters();
  }, []);


  async function fetchCharacters() {

    setLoadingCharacters(true);

    const {
      data,
      error,
    } = await supabase
      .from("characters")
      .select("*")
      .eq("is_active", true)
      .order("votes", {
        ascending: false,
      })
      .limit(10);


    if (error) {

      console.error(
        "Characters error:",
        error
      );

      setCharacters([]);

    } else {

      setCharacters(data || []);

    }

    setLoadingCharacters(false);
  }


  /* ===============================
     SEARCH CHARACTERS
  =============================== */

  useEffect(() => {

    const query =
      searchQuery.trim();


    if (!searchOpen || !query) {

      setSearchResults([]);
      setSearchLoading(false);

      return;
    }


    const timer =
      setTimeout(async () => {

        setSearchLoading(true);

        try {

          const {
            data,
            error,
          } = await supabase
            .from("characters")
            .select("*")
            .eq("is_active", true)
            .ilike(
              "name",
              `%${query}%`
            )
            .order("votes", {
              ascending: false,
            })
            .limit(20);


          if (error) {

            console.error(
              "Search error:",
              error
            );

            setSearchResults([]);

          } else {

            setSearchResults(
              data || []
            );

          }

        } catch (error) {

          console.error(
            "Search failed:",
            error
          );

          setSearchResults([]);

        } finally {

          setSearchLoading(false);

        }

      }, 300);


    return () =>
      clearTimeout(timer);

  }, [
    searchQuery,
    searchOpen,
  ]);


  /* ===============================
     BATTLE DATA
  =============================== */

  const leftVotes =
    Number(
      battle?.left_votes || 0
    );

  const rightVotes =
    Number(
      battle?.right_votes || 0
    );

  const percentages =
    calculatePercent(
      leftVotes,
      rightVotes
    );


  return (

    <div className="app">


      {/* ===============================
          SEARCH POPUP
      =============================== */}

      {searchOpen && (

        <div className="search-overlay">


          <div
            className="search-backdrop"
            onClick={() => {

              setSearchOpen(false);
              setSearchQuery("");
              setSearchResults([]);

            }}
          />


          <div className="search-panel">


            <div className="search-panel-header">

              <strong>
                Search Characters
              </strong>


              <button
                type="button"
                onClick={() => {

                  setSearchOpen(false);
                  setSearchQuery("");
                  setSearchResults([]);

                }}
              >
                ✕
              </button>

            </div>


            <div className="search-input-box">

              <span>
                🔎
              </span>


              <input
                type="text"
                autoFocus
                placeholder="Search Naruto, Luffy..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
              />

            </div>


            {!searchQuery.trim() && (

              <div className="search-message">

                <span>
                  🔎
                </span>

                <p>
                  Search your favorite character
                </p>

              </div>

            )}


            {searchLoading && (

              <div className="search-message">

                <p>
                  Searching...
                </p>

              </div>

            )}


            {!searchLoading &&
              searchQuery.trim() &&
              searchResults.length === 0 && (

                <div className="search-message">

                  <span>
                    🎭
                  </span>

                  <p>
                    No characters found
                  </p>

                </div>

              )}


            {!searchLoading &&
              searchResults.length > 0 && (

                <div className="search-results">

                  {searchResults.map(
                    (character) => (

                      <button
                        type="button"
                        className="search-result-item"
                        key={character.id}
                        onClick={() => {

                          navigate(
                            `/characters/${character.id}`
                          );

                          setSearchOpen(false);
                          setSearchQuery("");
                          setSearchResults([]);

                        }}
                      >


                        <div className="search-result-image">

                          {character.image_url ? (

                            <img
                              src={
                                character.image_url
                              }
                              alt={
                                character.name
                              }
                            />

                          ) : (

                            <span>
                              🎭
                            </span>

                          )}

                        </div>


                        <div className="search-result-info">

                          <strong>
                            {character.name}
                          </strong>


                          <small>
                            {character.category}
                          </small>


                          <span>

                            ♥{" "}

                            {Number(
                              character.votes || 0
                            ).toLocaleString()}

                          </span>

                        </div>


                        <b>
                          →
                        </b>


                      </button>

                    )
                  )}

                </div>

              )}


          </div>

        </div>

      )}


      {/* ===============================
          SIDE MENU
      =============================== */}

      {menuOpen && (

        <>

          <div
            className="menu-overlay"
            onClick={() =>
              setMenuOpen(false)
            }
          />


          <aside className="side-menu">


            <div className="side-menu-header">

              <strong>
                🔥 WHOWINS
              </strong>


              <button
                type="button"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                ✕
              </button>

            </div>


            <div className="side-menu-links">


              <button
                type="button"
                onClick={() => {

                  navigate("/");
                  setMenuOpen(false);

                }}
              >
                <span>⌂</span>
                Home
              </button>


              <button
                type="button"
                onClick={() => {

                  navigate(
                    "/daily-battles"
                  );

                  setMenuOpen(false);

                }}
              >
                <span>ϟ</span>
                Daily Battles
              </button>


              <button
                type="button"
                onClick={() => {

                  navigate(
                    "/tournaments"
                  );

                  setMenuOpen(false);

                }}
              >
                <span>♜</span>
                Tournaments
              </button>


              <button
                type="button"
                onClick={() => {

                  navigate(
                    "/characters"
                  );

                  setMenuOpen(false);

                }}
              >
                <span>♥</span>
                Characters
              </button>


              <button
                type="button"
                onClick={() => {

                  navigate("/polls");

                  setMenuOpen(false);

                }}
              >
                <span>▥</span>
                Polls
              </button>


              

            </div>


            <div className="side-menu-footer">

              <button
                type="button"
                onClick={() => {

                  navigate("/admin");

                  setMenuOpen(false);

                }}
              >
                ⚙ Admin Panel
              </button>

            </div>


          </aside>

        </>

      )}


      {/* HEADER */}

      <header className="topbar">


        <button
          className="icon-btn"
          type="button"
          onClick={() =>
            setMenuOpen(true)
          }
        >
          ☰
        </button>


        <div className="logo">

          <span className="crown">
            🔥
          </span>


          <div>

            <strong>
              WHO
              <span>
                WINS
              </span>
            </strong>


            <small>
              VOTE. BATTLE. CELEBRATE.
            </small>

          </div>

        </div>


        <div className="header-actions">

          <button
            className="icon-btn"
            type="button"
            onClick={() =>
              setSearchOpen(true)
            }
          >
            ⌕
          </button>

        </div>


      </header>


      <main>


        {/* TODAY'S BATTLE */}

        <section
          className="battle-card"
          onTouchStart={
            handleTouchStart
          }
          onTouchEnd={
            handleTouchEnd
          }
        >


          <div className="battle-header">

            <span className="badge">
              🔥 TODAY'S BATTLE
            </span>


            {battle ? (

              <span className="timer">

                {timeLeft.ended
                  ? "Battle Ended"
                  : (
                    <>
                      ◷ Ends in{" "}
                      {timeLeft.hours}:
                      {timeLeft.minutes}:
                      {timeLeft.seconds}
                    </>
                  )}

              </span>

            ) : (

              <span className="timer">
                No live battle
              </span>

            )}

          </div>


          {loadingBattle && (

            <div className="battle-loading">
              Loading battle...
            </div>

          )}


          {!loadingBattle &&
            !battle && (

              <div className="battle-loading">

                <h2>
                  No Live Battle
                </h2>

                <p>
                  Check back soon for
                  the next battle.
                </p>

                <button
                  className="outline-btn"
                  onClick={
                    fetchBattles
                  }
                >
                  RETRY
                </button>

              </div>

            )}


          {!loadingBattle &&
            battle && (

              <>


                <div
                  className="battle-area"
                  key={battle.id}
                >


                  <div className="fighter blue">

                    <div className="battle-character-image">

                      {battle.left_character
                        ?.image_url ? (

                        <img
                          src={
                            battle
                              .left_character
                              .image_url
                          }
                          alt={
                            battle
                              .left_character
                              .name
                          }
                        />

                      ) : (

                        <span>
                          🔵
                        </span>

                      )}

                    </div>


                    <h2>
                      {battle.left_character
                        ?.name ||
                        "Unknown"}
                    </h2>


                    <strong>
                      {percentages.left}%
                    </strong>


                    <small>
                      {leftVotes.toLocaleString()}{" "}
                      Votes
                    </small>

                  </div>


                  <div className="vs">
                    VS
                  </div>


                  <div className="fighter red">

                    <div className="battle-character-image">

                      {battle.right_character
                        ?.image_url ? (

                        <img
                          src={
                            battle
                              .right_character
                              .image_url
                          }
                          alt={
                            battle
                              .right_character
                              .name
                          }
                        />

                      ) : (

                        <span>
                          🔴
                        </span>

                      )}

                    </div>


                    <h2>
                      {battle.right_character
                        ?.name ||
                        "Unknown"}
                    </h2>


                    <strong>
                      {percentages.right}%
                    </strong>


                    <small>
                      {rightVotes.toLocaleString()}{" "}
                      Votes
                    </small>

                  </div>


                </div>


                <button
                  className="vote-btn"
                  onClick={() =>
                    navigate(
                      `/daily-battle/${battle.id}`
                    )
                  }
                >

                  VOTE NOW

                  <span>
                    →
                  </span>

                </button>


                {battles.length > 1 && (

                  <div className="dots">

                    {battles.map(
                      (item, index) => (

                        <i
                          key={item.id}
                          className={
                            index === currentIndex
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setCurrentIndex(index)
                          }
                        />

                      )
                    )}

                  </div>

                )}


                {battles.length > 1 && (

                  <div className="battle-position">

                    {currentIndex + 1}
                    {" / "}
                    {battles.length}

                  </div>

                )}


                {battles.length > 1 && (

                  <p className="swipe-text">
                    ← Swipe to view other
                    live battles →
                  </p>

                )}


              </>

            )}

        </section>


        {/* QUICK MENU */}

        <section className="quick-menu">


          <div
            className="quick-item"
            onClick={() =>
              navigate("/daily-battles")
            }
          >

            <div className="quick-icon purple">
              ϟ
            </div>

            <span>
              Daily
              <br />
              Battle
            </span>

          </div>


          <div
            className="quick-item"
            onClick={() =>
              navigate("/tournaments")
            }
          >

            <div className="quick-icon yellow">
              ♜
            </div>

            <span>
              Tournaments
            </span>

          </div>


          <div
            className="quick-item"
            onClick={() =>
              navigate("/characters")
            }
          >

            <div className="quick-icon pink">
              ♥
            </div>

            <span>
              Characters
            </span>

          </div>


          <div
            className="quick-item"
            onClick={() =>
              navigate("/polls")
            }
          >

            <div className="quick-icon blue">
              ▥
            </div>

            <span>
              All Polls
            </span>

          </div>


          <div
            className="quick-item"
            onClick={() =>
              navigate("/rewards")
            }
          >

            <div className="quick-icon violet">
              🎁
            </div>

            <span>
              Rewards
            </span>

          </div>


        </section>


        {/* POPULAR TOURNAMENT */}

        <section className="section">

          <div className="section-title">

            <h2>
              POPULAR TOURNAMENT
            </h2>

            <button
              onClick={() =>
                navigate("/tournaments")
              }
            >
              View All
            </button>

          </div>


          <div className="tournament-card">

            <div className="tournament-heading">

              <div className="mini-icon">
                🏆
              </div>

              <div>

                <strong>
                  TOONVERSE TOURNAMENTS
                </strong>

                <small>
                  View all active tournaments
                </small>

              </div>

              <span className="live">
                LIVE
              </span>

            </div>


            <button
              className="outline-btn"
              onClick={() =>
                navigate("/tournaments")
              }
            >
              VIEW TOURNAMENTS
            </button>

          </div>

        </section>


        {/* TRENDING CHARACTERS */}

        <section className="section">

          <div className="section-title">

            <h2>
              TRENDING CHARACTERS
            </h2>

            <button
              onClick={() =>
                navigate("/characters")
              }
            >
              View All
            </button>

          </div>


          <div className="character-scroll">

            {loadingCharacters ? (

              <p>
                Loading characters...
              </p>

            ) : (

              characters.map(
                (
                  character,
                  index
                ) => (

                  <div
                    className="character-card"
                    key={character.id}
                    onClick={() =>
                      navigate(
                        `/characters/${character.id}`
                      )
                    }
                  >

                    <div className="rank">
                      {index + 1}
                    </div>


                    <div className="character-image">

                      {character.image_url ? (

                        <img
                          src={
                            character.image_url
                          }
                          alt={
                            character.name
                          }
                        />

                      ) : (

                        <span>
                          🎭
                        </span>

                      )}

                    </div>


                    <strong>
                      {character.name}
                    </strong>


                    <small>

                      ♥{" "}

                      {Number(
                        character.votes || 0
                      ).toLocaleString()}

                    </small>

                  </div>

                )
              )

            )}

          </div>

        </section>


        {/* RECENT POLLS */}

        <section className="section">

          <div className="section-title">

            <h2>
              RECENT POLLS
            </h2>

            <button
              onClick={() =>
                navigate("/polls")
              }
            >
              View All
            </button>

          </div>


          <div className="poll-card">

            <div className="poll-side">

              <div className="poll-avatar">
                🗳️
              </div>

              <strong>
                Community Polls
              </strong>

              <span>
                Vote Now
              </span>

            </div>


            <div className="poll-vs">
              VS
            </div>


            <div className="poll-side right">

              <div className="poll-avatar">
                🔥
              </div>

              <strong>
                Your Choice
              </strong>

              <span>
                See Results
              </span>

            </div>

          </div>

        </section>


      </main>


      {/* BOTTOM NAV */}

      <nav className="bottom-nav">


        <div
          className="nav-item active"
          onClick={() =>
            navigate("/")
          }
        >
          <span>⌂</span>
          <small>Home</small>
        </div>


        <div
          className="nav-item"
          onClick={() =>
            navigate("/tournaments")
          }
        >
          <span>♜</span>
          <small>Tournaments</small>
        </div>


        <div
          className="nav-item"
          onClick={() =>
            navigate("/characters")
          }
        >
          <span>♡</span>
          <small>Characters</small>
        </div>


        <div
          className="nav-item"
          onClick={() =>
            navigate("/polls")
          }
        >
          <span>▥</span>
          <small>Polls</small>
        </div>


      </nav>


    </div>
  );
}


export default Home;