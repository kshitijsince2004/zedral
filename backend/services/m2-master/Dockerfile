FROM python:3.12-slim

# Security: run as non-root
RUN addgroup --system zedral && adduser --system --ingroup zedral zedral

WORKDIR /app

# Install shared library first (editable install)
COPY shared /shared
RUN pip install --no-cache-dir -e /shared

# Install service dependencies
COPY services/m2-master/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY services/m2-master/app/ ./app/

USER zedral

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
