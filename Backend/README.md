## Python Virtual Environment Setup

1. **Make sure you have Python 3 and pip installed.**
   - Check with: `python3 --version` and `pip --version`

2. **Navigate to the Backend directory:**
   ```sh
   cd Backend
   ```

3. **Create a virtual environment:**
   ```sh
   python3 -m venv .venv
   ```

4. **Activate the virtual environment:**
   ```sh
   source .venv/bin/activate
   ```

5. **Install required packages:**
   ```sh
   pip install -r requirements.txt
   ```

6. **(Optional) Deactivate the virtual environment when done:**
   ```sh
   deactivate
   ```

> **Note:** Add `.venv/` to your `.gitignore` to avoid committing the virtual environment to version control.