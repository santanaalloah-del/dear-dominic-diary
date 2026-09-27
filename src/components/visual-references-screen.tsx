                type="button"
                className={currentLookSubject === "dominic" ? "active" : ""}
                onClick={() => setCurrentLookSubject("dominic")}
              >
                Dominic
              </button>
            </div>

            <div className="current-look-type-strip">
              {currentLookTypes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={currentLookType === item.id ? "active" : ""}
                  onClick={() => setCurrentLookType(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <section className="current-look-upload-card">
            <div>
              <small>current look</small>
              <h2>
                {currentLookSubject === "alloah" ? "Alloah" : "Dominic"} ·{" "}
                {activeLookType?.label}
              </h2>
              <p>{activeLookType?.note}</p>
            </div>

            {currentLookType === "nails" && (
              <p className="current-look-status">
                Add several close reference photos if needed. The newest set
                automatically becomes the current nails; the old set stays in
                history.
              </p>
            )}

            {currentLookReferences.length > 0 && (
              <div className="current-look-preview-grid">
                {currentLookReferences.map((item) => (
                  <img
                    key={item.reference.id}
                    src={item.url}
                    alt={item.reference.title ?? "Current look"}
                  />
                ))}
              </div>
            )}

            <Button
              type="button"
              onClick={() => currentLookInputRef.current?.click()}
              disabled={uploading}
            >
              <Sparkles />
              {uploading
                ? "Updating..."
                : currentLookReferences.length > 0
                  ? "Update"
                  : "Add current look"}
            </Button>
            <input
              ref={currentLookInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleCurrentLookUpload}
            />
          </section>

          {error && <p className="form-error">{error}</p>}

          {loading ? (
            <p className="empty-copy">loading current look...</p>
          ) : currentLookReferences.length === 0 ? (
            <section className="empty-state-card">
              <ImageIcon />
              <h2>Nothing current yet.</h2>
              <p>
                Put temporary details here. Identity references stay untouched.
              </p>
            </section>
          ) : (
            <section className="current-look-summary">
              <small>active now</small>
              <strong>{activeLookType?.label}</strong>
              <span>
                {currentLookReferences.length}{" "}
                {currentLookReferences.length === 1 ? "reference" : "references"}
              </span>
            </section>
          )}
        </>
      )}
    </section>
  );
}

