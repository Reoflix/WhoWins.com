import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  supabase,
} from "../lib/supabase";

import "./dailyBattles.css";


function DailyBattles() {

  const navigate = useNavigate();

  const [battles, setBattles] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");


  useEffect(() => {

    fetchBattles();

  }, []);


  async function fetchBattles() {

    setLoading(true);
    setMessage("");


    try {

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
        .order("created_at", {
          ascending: false,
        });


      if (error) {

        console.error(
          "Live battles error:",
          error
        );

        setMessage(
          "Battles load nahi ho paayi."
        );

        setBattles([]);

        return;
      }


      setBattles(
        data || []
      );

    } catch (error) {

      console.error(
        "Unexpected error:",
        error
      );

      setMessage(
        "Something went wrong."
      );

    } finally {

      setLoading(false);

    }

  }


  return (

    <div className="daily-battles-page">


      {/* HEADER */}

      <header className="daily-battles-header">

        <button
          className="battles-back-btn"
          onClick={() =>
            navigate("/")
          }
        >
          ←
        </button>


        <div>

          <h1>
            Daily Battles
          </h1>

          <span>
            Choose a live battle
          </span>

        </div>


        <div className="header-space" />

      </header>


      <main className="daily-battles-content">


        <div className="live-title">

          <span>
            🔥 LIVE NOW
          </span>

          <small>
            {battles.length} Active Battles
          </small>

        </div>


        {loading ? (

          <div className="battles-loading">

            Loading live battles...

          </div>

        ) : message ? (

          <div className="no-battles">

            <h2>
              Error
            </h2>

            <p>
              {message}
            </p>


            <button
              onClick={fetchBattles}
            >
              Retry
            </button>

          </div>

        ) : battles.length === 0 ? (

          <div className="no-battles">

            <h2>
              No Live Battles
            </h2>

            <p>
              Abhi koi battle live nahi hai.
              Jaldi wapas check karein!
            </p>

          </div>

        ) : (

          <div className="battles-list">

            {battles.map(
              (battle) => (

                <div
                  className="live-battle-card"
                  key={battle.id}
                  onClick={() =>
                    navigate(
                      `/daily-battle/${battle.id}`
                    )
                  }
                >


                  {/* LIVE */}

                  <div className="battle-live-row">

                    <span className="live-badge">

                      🔥 LIVE

                    </span>


                    <span className="battle-status">

                      Vote Now →

                    </span>

                  </div>


                  {/* CHARACTERS */}

                  <div className="live-battle-fighters">


                    {/* LEFT */}

                    <div className="live-fighter">

                      <div className="live-character-image">

                        {battle.left_character
                          ?.image_url ? (

                          <img
                            src={
                              battle.left_character
                                .image_url
                            }
                            alt={
                              battle.left_character
                                .name
                            }
                          />

                        ) : (

                          <span>
                            ?
                          </span>

                        )}

                      </div>


                      <strong>

                        {
                          battle.left_character
                            ?.name
                        }

                      </strong>

                    </div>


                    <div className="live-vs">

                      VS

                    </div>


                    {/* RIGHT */}

                    <div className="live-fighter">

                      <div className="live-character-image">

                        {battle.right_character
                          ?.image_url ? (

                          <img
                            src={
                              battle.right_character
                                .image_url
                            }
                            alt={
                              battle.right_character
                                .name
                            }
                          />

                        ) : (

                          <span>
                            ?
                          </span>

                        )}

                      </div>


                      <strong>

                        {
                          battle.right_character
                            ?.name
                        }

                      </strong>

                    </div>


                  </div>


                  {/* TITLE */}

                  <div className="battle-card-bottom">

                    <span>

                      {battle.title ||
                        "Daily Battle"}

                    </span>


                    <button>

                      OPEN BATTLE →

                    </button>

                  </div>


                </div>

              )
            )}

          </div>

        )}

      </main>

    </div>

  );

}


export default DailyBattles;