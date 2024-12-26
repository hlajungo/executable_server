from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import stat
import subprocess
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # 允許跨域請求

# 測試路徑
@app.route('/')
def home():
    return "Flask server is running!"

# 載入 JSON 文件
def load_data(myfile):
    if os.path.exists(myfile):
        with open(myfile, "r", encoding="utf-8") as file:
            return json.load(file)
    return []

# 儲存 JSON 文件
def save_data(myfile, data):
    with open(myfile, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4, ensure_ascii=False)

# 讓文件可執行
def make_executable(file_path):
    # 獲取當前文件權限
    st = os.stat(file_path)
    # 增加可執行權限
    os.chmod(file_path, st.st_mode | stat.S_IEXEC)

# 可執行檔儲存位置
ALLOWED_EXTENSIONS = {'exe', 'bin'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB
UPLOAD_FOLDER = './uploaded_files'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# 權限檢查
if not os.access(UPLOAD_FOLDER, os.W_OK):
    raise PermissionError(f"Upload folder '{UPLOAD_FOLDER}' is not writable.")

# 允許的類型檢查
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 接收可執行檔
@app.route('/api/upload_executable_file', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400

        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(save_path)

        make_executable(save_path)

        return jsonify({
            'message': 'File uploaded successfully',
            'filename': filename,
            'file_path': save_path
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# dashboard
DASHBOARD_DATA_FILE = 'dashboard_data.json'
# check file exists, otherwise create it as empty
if not os.path.exists(DASHBOARD_DATA_FILE):
    with open(DASHBOARD_DATA_FILE, 'w') as file:
        json.dump({}, file)


"""
{
  "title": "mytitle",
  "inputNum": 4,
  "inputType": ["Text", "Text", "Text", "Text"],
  "outputNum": 1,
  "outputType": ["Text"],
  "executableName": "Exe1"
}
"""
# 接收dashboard 資料
@app.route('/api/dashboard_data', methods=['POST'])
def post_dashboard_data():
    try:
        # 獲取請求中的 JSON 數據
        new_entry = request.get_json()
        if not new_entry:
            return jsonify({'error': 'No JSON data received'}), 400

         # 載入現有資料
        data = load_data(DASHBOARD_DATA_FILE)

        # 附加新資料
        data.append(new_entry)

        # 儲存更新後的資料
        save_data(DASHBOARD_DATA_FILE, data)

        return jsonify({'message': 'Data saved successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/dashboard_data', methods=['GET'])
def get_dashboard_data():
    try:
        data = load_data(DASHBOARD_DATA_FILE)

        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

"""
{
  ExecutableName: "Exe1"
  Input: [Text1, Text2, Text3]
}
"""
@app.route('/api/compute', methods=['POST'])
def post_compute():
    data = request.get_json()

    # 檢查是否有必要的鍵值
    if "executableName" not in data or "input" not in data:
        return jsonify({"error": "缺少必要的欄位"}), 400

    executable_name = data["executableName"]
    inputs = data["input"]

    # 構建完整的可執行檔路徑
    executable_path = os.path.join(UPLOAD_FOLDER, executable_name)

    # 檢查可執行檔是否存在
    if not os.path.isfile(executable_path):
        return jsonify({"error": "可執行檔不存在"}), 404

    # 構建命令
    command = [executable_path] + inputs

    # 執行命令並將輸出重定向到文件
    output_file_path = os.path.join(UPLOAD_FOLDER, f"{executable_name}.data")
    try:
        with open(output_file_path, "w") as output_file:
            subprocess.run(command, stdout=output_file, stderr=subprocess.PIPE, check=True)

        data = load_data(output_file_path)
        jsondata = {
                "executableName": os.path.basename(executable_name),
                "output": data
                }
        return jsonify(jsondata), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"執行過程中出現錯誤: {e.stderr.decode()}"}), 500

# 啟動伺服器
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

