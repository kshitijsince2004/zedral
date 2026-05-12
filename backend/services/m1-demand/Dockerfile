FROM python:3.12-slim

RUN addgroup --system zedral && adduser --system --ingroup zedral zedral

WORKDIR /app

COPY shared /shared
RUN pip install --no-cache-dir -e /shared

COPY services/m1-demand/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/m1-demand/app/ ./app/

USER zedral

EXPOSE 8002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
