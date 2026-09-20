FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py rule_engine.py responses.py system_prompt.txt ./
COPY templates/ templates/
COPY static/ static/

ENV PORT=5003
EXPOSE 5003
CMD ["python", "app.py"]
