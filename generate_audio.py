import os
import json
import markdown
from bs4 import BeautifulSoup
from gtts import gTTS

# Konfiguracja
AUDIO_DIR = "audio"
POSTS_DIR = "posts"

def clean_text(md_content):
    """
    Konwertuje markdown na czysty tekst do odczytu.
    """
    # 1. Konwersja MD -> HTML
    html = markdown.markdown(md_content)
    # 2. Wyciągnięcie tekstu z HTML (usuwa tagi)
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text()
    return text

def process_lang(lang):
    json_path = os.path.join(POSTS_DIR, lang, "index.json")
    if not os.path.exists(json_path):
        print(f"Nie znaleziono pliku indeksu: {json_path}")
        return
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            posts = json.load(f)
    except Exception as e:
        print(f"Błąd odczytu JSON {json_path}: {e}")
        return
    
    # Upewnij się, że katalog wyjściowy istnieje
    output_dir = os.path.join(AUDIO_DIR, lang)
    os.makedirs(output_dir, exist_ok=True)
    
    lang_code = 'pl' if lang == 'pl' else 'en'
    json_updated = False
    
    for post in posts:
        post_id = post.get('id')
        title = post.get('title', '')
        
        if not post_id:
            continue

        md_path = os.path.join(POSTS_DIR, lang, f"{post_id}.md")
        audio_path = os.path.join(output_dir, f"{post_id}.mp3")
        
        if not os.path.exists(md_path):
            print(f"⚠️ Brak pliku treści: {md_path}")
            continue

        # Wczytaj treść (potrzebna też do czasu czytania)
        try:
            with open(md_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # --- AKTUALIZACJA CZASU CZYTANIA ---
            # Prosta kalkulacja: 200 słów na minutę
            # Używamy clean_text aby nie liczysz tagów HTML/MD jako słów
            txt_for_count = clean_text(content)
            word_count = len(txt_for_count.split())
            read_time = max(1, round(word_count / 200))
            
            if post.get('readTime') != read_time:
                post['readTime'] = read_time
                json_updated = True
                print(f"⏱️  Zaktualizowano czas czytania dla {post_id}: {read_time} min")

            # --- GENEROWANIE AUDIO ---
            # Sprawdź czy plik wykonać (pomiń jeśli istnieje i aktualny)
            should_generate = True
            if os.path.exists(audio_path):
                md_mtime = os.path.getmtime(md_path)
                mp3_mtime = os.path.getmtime(audio_path)
                if md_mtime < mp3_mtime:
                    should_generate = False
            
            if should_generate:
                print(f"🎙️ Generowanie audio dla: {post_id} [{lang}]...")
                
                # Prosta heurystyka usuwania powtórzonego tytułu na początku
                header_title = f"# {title}"
                body_content = content
                if body_content.strip().startswith(header_title):
                    body_content = body_content.replace(header_title, "", 1)
                
                clean_body = clean_text(body_content)
                full_text = f"{title}. \n\n {clean_body}"
                
                if not full_text.strip():
                    print("Pusty tekst, pomijam.")
                else:
                    tts = gTTS(text=full_text, lang=lang_code)
                    tts.save(audio_path)
                    print(f"✅ Zapisano: {audio_path}")
            
        except Exception as e:
            print(f"❌ Błąd przy przetwarzaniu {post_id}: {e}")

    # Zapisz zmiany w JSON jeśli były (np. czasy czytania)
    if json_updated:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(posts, f, indent=4, ensure_ascii=False)
        print(f"💾 Zaktualizowano index.json ({lang})")

if __name__ == "__main__":
    print("--- Start generowania audio ---")
    process_lang('pl')
    process_lang('en')
    print("--- Zakończono ---")
