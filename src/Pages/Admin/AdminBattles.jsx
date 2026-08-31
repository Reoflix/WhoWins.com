import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./adminBattles.css";

function AdminBattles() {
  const navigate = useNavigate();

  const [characters, setCharacters] = useState([]);
  const [battles, setBattles] = useState([]);

  const [title, setTitle] = useState("Today's Battle");
  const [leftCharacter, setLeftCharacter] = useState("");
  const [rightCharacter, setRightCharacter] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [charactersResult, battlesResult] =
      await Promise.all([
        supabase
          .from("characters")
          .select("id, name, image_url")
          .eq("is_active", true)
          .order("name"),

        supabase
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
          .order("created_at", { ascending: false }),
      ]);

    if (charactersResult.error) {
      console.error(charactersResult.error);
    } else {
      setCharacters(charactersResult.data || []);
    }

    if (battlesResult.error) {
      console.error(battlesResult.error);
    } else {
      setBattles(battlesResult.data || []);
    }

    setLoading(false);
  }

  async function createBattle(e) {
    e.preventDefault();

    if (!leftCharacter || !rightCharacter) {
      alert("Dono characters select karo.");
      return;
    }

    if (leftCharacter === rightCharacter) {
      alert("Ek hi character ko dono sides par select nahi kar sakte.");
      return;
    }

    if (!startsAt || !endsAt) {
      alert("Start aur end time select karo.");
      return;
    }

    if (new Date(endsAt) <= new Date(startsAt)) {
      alert("End time start time ke baad hona chahiye.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("battles")
      .insert({
        title: title.trim() || "Today's Battle",
        left_character_id: leftCharacter,
        right_character_id: rightCharacter,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        status: "upcoming",
        left_votes: 0,
        right_votes: 0,
        is_featured: false,
      });

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      alert("Battle created successfully! ⚔️");

      setTitle("Today's Battle");
      setLeftCharacter("");
      setRightCharacter("");
      setStartsAt("");
      setEndsAt("");

      loadData();
    }

    setSaving(false);
  }

  async function updateBattleStatus(id, status) {
    const { error } = await supabase
      .from("battles")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    loadData();
  }

  async function toggleFeatured(battle) {
    const { error } = await supabase
      .from("battles")
      .update({
        is_featured: !battle.is_featured,
      })
      .eq("id", battle.id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    loadData();
  }

  async function deleteBattle(id) {
    const confirmed = window.confirm(
      "Kya tum ye battle delete karna chahte ho?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("battles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    loadData();
  }

  function formatDate(date) {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="admin-battles-page">

      {/* HEADER */}

      <header className="admin-battles-header">

        <button onClick={() => navigate("/admin/dashboard")}>
          ←
        </button>

        <div>
          <span>TOONVERSE ADMIN</span>
          <h1>Daily Battles</h1>
        </div>

        <button onClick={loadData}>
          ↻
        </button>

      </header>


      <main className="admin-battles-content">

        {/* CREATE BATTLE */}

        <section className="battle-form-card">

          <div className="battle-form-title">
            <div>
              <span>⚔️</span>

              <div>
                <h2>Create Battle</h2>
                <small>
                  Choose two characters for a new battle
                </small>
              </div>
            </div>
          </div>


          <form onSubmit={createBattle}>

            <label className="battle-field">
              <span>Battle Title</span>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Today's Battle"
              />
            </label>


            {/* FIGHTERS */}

            <div className="fighter-select-grid">

              <label className="battle-field">
                <span>LEFT CHARACTER</span>

                <select
                  value={leftCharacter}
                  onChange={(e) =>
                    setLeftCharacter(e.target.value)
                  }
                >
                  <option value="">
                    Select character
                  </option>

                  {characters.map((character) => (
                    <option
                      key={character.id}
                      value={character.id}
                    >
                      {character.name}
                    </option>
                  ))}
                </select>
              </label>


              <div className="battle-vs">
                VS
              </div>


              <label className="battle-field">
                <span>RIGHT CHARACTER</span>

                <select
                  value={rightCharacter}
                  onChange={(e) =>
                    setRightCharacter(e.target.value)
                  }
                >
                  <option value="">
                    Select character
                  </option>

                  {characters.map((character) => (
                    <option
                      key={character.id}
                      value={character.id}
                    >
                      {character.name}
                    </option>
                  ))}
                </select>
              </label>

            </div>


            {/* DATES */}

            <div className="battle-date-grid">

              <label className="battle-field">
                <span>START DATE & TIME</span>

                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) =>
                    setStartsAt(e.target.value)
                  }
                />
              </label>


              <label className="battle-field">
                <span>END DATE & TIME</span>

                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) =>
                    setEndsAt(e.target.value)
                  }
                />
              </label>

            </div>


            <button
              className="create-battle-btn"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "CREATING..."
                : "CREATE BATTLE"}

              {!saving && <span>→</span>}
            </button>

          </form>

        </section>


        {/* BATTLE LIST */}

        <section className="admin-battle-list">

          <div className="admin-battle-list-title">
            <div>
              <h2>All Battles</h2>

              <small>
                {battles.length} battles
              </small>
            </div>
          </div>


          {loading ? (
            <div className="battle-message">
              Loading battles...
            </div>
          ) : battles.length === 0 ? (
            <div className="battle-message">
              <span>⚔️</span>

              <h3>
                No battles yet
              </h3>

              <p>
                Create your first battle above.
              </p>
            </div>
          ) : (
            <div className="battle-list">

              {battles.map((battle) => (

                <div
                  className="battle-item"
                  key={battle.id}
                >

                  <div className="battle-item-top">

                    <div>
                      <strong>
                        {battle.title}
                      </strong>

                      <small>
                        {formatDate(battle.starts_at)}
                        {" → "}
                        {formatDate(battle.ends_at)}
                      </small>
                    </div>

                    <span
                      className={`battle-status ${battle.status}`}
                    >
                      {battle.status.toUpperCase()}
                    </span>

                  </div>


                  <div className="battle-fighters">

                    <div className="battle-character">

                      <div className="battle-character-image">

                        {battle.left_character?.image_url ? (
                          <img
                            src={
                              battle.left_character.image_url
                            }
                            alt={
                              battle.left_character.name
                            }
                          />
                        ) : (
                          <span>?</span>
                        )}

                      </div>

                      <strong>
                        {battle.left_character?.name}
                      </strong>

                      <small>
                        {battle.left_votes || 0} votes
                      </small>

                    </div>


                    <div className="battle-vs-big">
                      VS
                    </div>


                    <div className="battle-character">

                      <div className="battle-character-image">

                        {battle.right_character?.image_url ? (
                          <img
                            src={
                              battle.right_character.image_url
                            }
                            alt={
                              battle.right_character.name
                            }
                          />
                        ) : (
                          <span>?</span>
                        )}

                      </div>

                      <strong>
                        {battle.right_character?.name}
                      </strong>

                      <small>
                        {battle.right_votes || 0} votes
                      </small>

                    </div>

                  </div>


                  <div className="battle-item-actions">

                    <button
                      onClick={() =>
                        updateBattleStatus(
                          battle.id,
                          "live"
                        )
                      }
                    >
                      🟢 Live
                    </button>

                    <button
                      onClick={() =>
                        updateBattleStatus(
                          battle.id,
                          "completed"
                        )
                      }
                    >
                      ✓ Complete
                    </button>

                    <button
                      onClick={() =>
                        toggleFeatured(battle)
                      }
                    >
                      {battle.is_featured
                        ? "⭐ Featured"
                        : "☆ Feature"}
                    </button>

                    <button
                      className="battle-delete"
                      onClick={() =>
                        deleteBattle(battle.id)
                      }
                    >
                      🗑️
                    </button>

                  </div>

                </div>

              ))}

            </div>
          )}

        </section>

      </main>

    </div>
  );
}

export default AdminBattles;