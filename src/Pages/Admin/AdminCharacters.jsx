import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import "./adminCharacters.css";

const CHARACTERS_PER_PAGE = 20;

function AdminCharacters() {
  const navigate = useNavigate();

  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Cartoon");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [currentImage, setCurrentImage] = useState("");
  const [isActive, setIsActive] = useState(true);

  // SEARCH + FILTER
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // PAGINATION
  const [page, setPage] = useState(1);
  const [totalCharacters, setTotalCharacters] = useState(0);

  useEffect(() => {
    fetchCharacters();
  }, [page, search, statusFilter]);

  async function fetchCharacters() {
    setLoading(true);

    try {
      const from =
        (page - 1) * CHARACTERS_PER_PAGE;

      const to =
        from + CHARACTERS_PER_PAGE - 1;

      let query = supabase
        .from("characters")
        .select("*", {
          count: "exact",
        })
        .order("created_at", {
          ascending: false,
        });

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search.trim()}%,category.ilike.%${search.trim()}%`
        );
      }

      if (statusFilter === "active") {
        query = query.eq(
          "is_active",
          true
        );
      }

      if (statusFilter === "hidden") {
        query = query.eq(
          "is_active",
          false
        );
      }

      const {
        data,
        error,
        count,
      } = await query.range(from, to);

      if (error) {
        throw error;
      }

      setCharacters(data || []);
      setTotalCharacters(count || 0);

    } catch (error) {
      console.error(error);
      alert(
        "Characters load nahi ho paaye."
      );

    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setCategory("Cartoon");
    setDescription("");
    setImageFile(null);
    setCurrentImage("");
    setIsActive(true);

    const fileInput =
      document.getElementById(
        "character-image"
      );

    if (fileInput) {
      fileInput.value = "";
    }
  }

  function editCharacter(character) {
    setEditingId(character.id);
    setName(character.name || "");
    setCategory(
      character.category || "Cartoon"
    );
    setDescription(
      character.description || ""
    );
    setCurrentImage(
      character.image_url || ""
    );
    setImageFile(null);

    // IMPORTANT:
    // Hidden character edit karne par
    // automatically Active nahi hoga.
    setIsActive(
      character.is_active ?? true
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleImageChange(e) {
    const file =
      e.target.files?.[0] || null;

    if (!file) return;

    if (
      !file.type.startsWith("image/")
    ) {
      alert(
        "Please select a valid image."
      );

      return;
    }

    setImageFile(file);

    // OLD URL preview cleanup
    if (
      currentImage &&
      currentImage.startsWith("blob:")
    ) {
      URL.revokeObjectURL(
        currentImage
      );
    }

    // NEW IMAGE PREVIEW
    const previewUrl =
      URL.createObjectURL(file);

    setCurrentImage(previewUrl);
  }

  async function uploadImage() {
    // No new image selected
    if (!imageFile) {
      return currentImage;
    }

    const fileExt =
      imageFile.name
        .split(".")
        .pop()
        ?.toLowerCase();

    const safeName =
      (name || "character")
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          "-"
        )
        .replace(
          /^-|-$/g,
          ""
        );

    const fileName =
      `${safeName}-${Date.now()}.${fileExt}`;

    const filePath = fileName;

    const {
      error: uploadError,
    } = await supabase.storage
      .from("characters")
      .upload(
        filePath,
        imageFile,
        {
          cacheControl: "3600",
          upsert: false,
        }
      );

    if (uploadError) {
      console.error(uploadError);

      throw new Error(
        "Image upload nahi ho paayi: " +
          uploadError.message
      );
    }

    const { data } =
      supabase.storage
        .from("characters")
        .getPublicUrl(
          filePath
        );

    return data.publicUrl;
  }

  async function saveCharacter(e) {
    e.preventDefault();

    if (!name.trim()) {
      alert(
        "Character name daalo."
      );
      return;
    }

    if (
      !editingId &&
      !imageFile
    ) {
      alert(
        "Character image select karo."
      );
      return;
    }

    setSaving(true);

    try {
      const imageUrl =
        await uploadImage();

      const characterData = {
        name: name.trim(),
        category,
        description:
          description.trim(),
        image_url: imageUrl,
        is_active: isActive,
      };

      if (editingId) {
        const { error } =
          await supabase
            .from("characters")
            .update(characterData)
            .eq(
              "id",
              editingId
            );

        if (error) {
          throw error;
        }

        alert(
          "Character updated successfully! ✅"
        );

      } else {
        const { error } =
          await supabase
            .from("characters")
            .insert(
              characterData
            );

        if (error) {
          throw error;
        }

        alert(
          "Character added successfully! 🎉"
        );

        setPage(1);
      }

      resetForm();
      fetchCharacters();

    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Something went wrong."
      );

    } finally {
      setSaving(false);
    }
  }

  async function deleteCharacter(
    character
  ) {
    const confirmed =
      window.confirm(
        `Delete ${character.name}?`
      );

    if (!confirmed) return;

    try {
      const { error } =
        await supabase
          .from("characters")
          .delete()
          .eq(
            "id",
            character.id
          );

      if (error) {
        throw error;
      }

      // If last item deleted
      // and current page becomes empty
      if (
        characters.length === 1 &&
        page > 1
      ) {
        setPage(page - 1);
      } else {
        fetchCharacters();
      }

    } catch (error) {
      console.error(error);

      alert(
        "Character delete nahi hua. Ho sakta hai ye kisi battle ya tournament me use ho raha ho."
      );
    }
  }

  async function toggleActive(character) {
    try {
      const { error } =
        await supabase
          .from("characters")
          .update({
            is_active:
              !character.is_active,
          })
          .eq(
            "id",
            character.id
          );

      if (error) {
        throw error;
      }

      fetchCharacters();

    } catch (error) {
      console.error(error);

      alert(
        "Status update nahi hua."
      );
    }
  }

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalCharacters /
          CHARACTERS_PER_PAGE
      )
    );

  return (
    <div className="admin-characters-page">

      {/* HEADER */}

      <header className="admin-character-header">

        <button
          onClick={() =>
            navigate("/admin")
          }
        >
          ←
        </button>

        <div>
          <span>
            TOONVERSE ADMIN
          </span>

          <h1>
            Characters
          </h1>
        </div>

        <button
          onClick={resetForm}
        >
          +
        </button>

      </header>


      <main className="admin-character-content">

        {/* FORM */}

        <section className="character-form-card">

          <div className="admin-character-title">

            <div>

              <span>
                {editingId
                  ? "✏️"
                  : "✨"}
              </span>

              <div>

                <h2>
                  {editingId
                    ? "Edit Character"
                    : "Add Character"}
                </h2>

                <small>
                  {editingId
                    ? "Update character information"
                    : "Add a new character to ToonVerse"}
                </small>

              </div>

            </div>

            {editingId && (

              <button
                type="button"
                className="cancel-edit"
                onClick={resetForm}
              >
                Cancel
              </button>

            )}

          </div>


          <form
            onSubmit={saveCharacter}
          >

            {/* IMAGE */}

            <div className="image-upload-box">

              <input
                id="character-image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={
                  handleImageChange
                }
              />

              <label
                htmlFor="character-image"
              >

                {currentImage ? (

                  <div className="current-image-preview">

                    <img
                      src={currentImage}
                      alt={name}
                    />

                    <span>
                      Click to change image
                    </span>

                  </div>

                ) : (

                  <div className="upload-placeholder">

                    <span>
                      ＋
                    </span>

                    <strong>
                      Upload Character Image
                    </strong>

                    <small>
                      PNG, JPG or WEBP
                    </small>

                  </div>

                )}

              </label>

            </div>


            {/* NAME */}

            <label className="admin-field">

              <span>
                Character Name
              </span>

              <input
                type="text"
                placeholder="e.g. Doraemon"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
              />

            </label>


            {/* CATEGORY */}

            <label className="admin-field">

              <span>
                Category
              </span>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value
                  )
                }
              >

                <option value="Cartoon">
                  Cartoon
                </option>

                <option value="Anime">
                  Anime
                </option>

                <option value="Game">
                  Game
                </option>

                <option value="Other">
                  Other
                </option>

              </select>

            </label>


            {/* DESCRIPTION */}

            <label className="admin-field">

              <span>
                Description
              </span>

              <textarea
                placeholder="Short character description..."
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                rows="4"
              />

            </label>


            {/* STATUS */}

            <label className="character-status-field">

              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) =>
                  setIsActive(
                    e.target.checked
                  )
                }
              />

              <span>
                Character Active
              </span>

            </label>


            <button
              className="save-character-btn"
              type="submit"
              disabled={saving}
            >

              {saving
                ? "SAVING..."
                : editingId
                ? "UPDATE CHARACTER"
                : "ADD CHARACTER"}

              {!saving && (
                <span>
                  →
                </span>
              )}

            </button>

          </form>

        </section>


        {/* CHARACTER LIST */}

        <section className="admin-character-list">

          <div className="admin-list-title">

            <div>

              <h2>
                All Characters
              </h2>

              <small>
                {totalCharacters} characters
              </small>

            </div>

            <button
              onClick={
                fetchCharacters
              }
              title="Refresh"
            >
              ↻
            </button>

          </div>


          {/* SEARCH */}

          <div className="character-search">

            <span>
              🔍
            </span>

            <input
              type="text"
              placeholder="Search character..."
              value={search}
              onChange={(e) =>
                handleSearchChange(
                  e.target.value
                )
              }
            />

          </div>


          {/* FILTER */}

          <div className="character-filters">

            <button
              className={
                statusFilter === "all"
                  ? "filter-active"
                  : ""
              }
              onClick={() =>
                handleStatusChange("all")
              }
            >
              All
            </button>

            <button
              className={
                statusFilter === "active"
                  ? "filter-active"
                  : ""
              }
              onClick={() =>
                handleStatusChange(
                  "active"
                )
              }
            >
              Active
            </button>

            <button
              className={
                statusFilter === "hidden"
                  ? "filter-active"
                  : ""
              }
              onClick={() =>
                handleStatusChange(
                  "hidden"
                )
              }
            >
              Hidden
            </button>

          </div>


          {/* LIST */}

          {loading ? (

            <div className="admin-loading">
              Loading characters...
            </div>

          ) : characters.length === 0 ? (

            <div className="admin-empty">

              <span>
                🎭
              </span>

              <h3>
                No characters found
              </h3>

              <p>
                Try changing your search
                or filters.
              </p>

            </div>

          ) : (

            <div className="admin-character-items">

              {characters.map(
                (character) => (

                  <div
                    className="admin-character-item"
                    key={character.id}
                  >

                    <div className="admin-character-item-image">

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
                          ?
                        </span>

                      )}

                    </div>


                    <div className="admin-character-item-info">

                      <strong>
                        {character.name}
                      </strong>

                      <span>
                        {character.category}
                      </span>

                      <small>
                        ❤️{" "}
                        {(
                          character.votes || 0
                        ).toLocaleString()}{" "}
                        votes
                      </small>

                    </div>


                    <div className="admin-character-actions">

                      <button
                        className={
                          character.is_active
                            ? "active-status"
                            : "inactive-status"
                        }
                        onClick={() =>
                          toggleActive(
                            character
                          )
                        }
                      >

                        {character.is_active
                          ? "ACTIVE"
                          : "HIDDEN"}

                      </button>


                      <button
                        onClick={() =>
                          editCharacter(
                            character
                          )
                        }
                      >
                        ✏️
                      </button>


                      <button
                        className="delete-btn"
                        onClick={() =>
                          deleteCharacter(
                            character
                          )
                        }
                      >
                        🗑️
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}


          {/* PAGINATION */}

          {!loading &&
            totalPages > 1 && (

              <div className="character-pagination">

                <button
                  disabled={
                    page === 1
                  }
                  onClick={() =>
                    setPage(
                      page - 1
                    )
                  }
                >
                  ← Previous
                </button>


                <span>
                  Page {page} of{" "}
                  {totalPages}
                </span>


                <button
                  disabled={
                    page ===
                    totalPages
                  }
                  onClick={() =>
                    setPage(
                      page + 1
                    )
                  }
                >
                  Next →
                </button>

              </div>

            )}

        </section>

      </main>

    </div>
  );
}

export default AdminCharacters;