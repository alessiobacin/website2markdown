# Deployment Guide - Website2Markdown

Questa guida spiega come fare il build e il deploy dell'applicazione Website2Markdown usando Docker e Kubernetes.

## 🐳 Docker

### Build dell'immagine

```bash
# Build dell'immagine Docker
docker build -t website2markdown:latest .

# Build con tag specifico
docker build -t website2markdown:v1.0.0 .
```

### Test locale con Docker

```bash
# Esegui il container localmente
docker run -d \
  --name website2markdown \
  -p 3000:3000 \
  -e X_API_KEY="nb_api_2024_7f8e9d1c2b3a4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z" \
  -e PORT="3000" \
  website2markdown:latest

# Verifica che il container sia in esecuzione
docker ps

# Test dell'health check
curl http://localhost:3000/health

# Ferma e rimuovi il container
docker stop website2markdown
docker rm website2markdown
```

### Push su registry

```bash
# Tag per registry (esempio con Docker Hub)
docker tag website2markdown:latest your-username/website2markdown:latest

# Push su registry
docker push your-username/website2markdown:latest
```

## ☸️ Kubernetes

### Prerequisiti

- Cluster Kubernetes funzionante
- `kubectl` configurato per accedere al cluster
- Ingress controller (nginx) se si vuole esporre il servizio esternamente

### Deploy dell'applicazione

```bash
# Applica tutti i manifests
kubectl apply -f k8s-manifest.yaml

# Verifica il deployment
kubectl get deployments
kubectl get pods
kubectl get services

# Controlla i logs
kubectl logs -l app=website2markdown
```

### Configurazione dell'API Key

L'API key è configurata come Secret Kubernetes. Per cambiarla:

```bash
# Genera una nuova API key codificata in base64
echo -n "your-new-api-key" | base64

# Modifica il secret
kubectl edit secret website2markdown-secret

# Oppure ricrea il secret
kubectl delete secret website2markdown-secret
kubectl create secret generic website2markdown-secret \
  --from-literal=X_API_KEY="your-new-api-key"

# Riavvia i pod per applicare la nuova configurazione
kubectl rollout restart deployment website2markdown
```

### Test del servizio

```bash
# Port forward per test locale
kubectl port-forward service/website2markdown-service 8080:80

# Test dell'API
curl -X POST http://localhost:8080/api/convert \
  -H "Content-Type: application/json" \
  -H "x-api-key: nb_api_2024_7f8e9d1c2b3a4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z" \
  -d '{"url": "example.com", "maxPages": 5}'
```

### Scaling

```bash
# Scale manuale
kubectl scale deployment website2markdown --replicas=5

# L'HPA (HorizontalPodAutoscaler) gestisce lo scaling automatico
# basato su CPU (70%) e memoria (80%)
kubectl get hpa
```

### Monitoring

```bash
# Stato generale
kubectl get all -l app=website2markdown

# Logs in tempo reale
kubectl logs -f -l app=website2markdown

# Descrizione del deployment
kubectl describe deployment website2markdown

# Eventi del cluster
kubectl get events --sort-by=.metadata.creationTimestamp
```

### Ingress (Accesso esterno)

Per esporre il servizio esternamente:

1. Modifica il file `k8s-manifest.yaml` nella sezione Ingress
2. Sostituisci `website2markdown.example.com` con il tuo dominio
3. Configura il DNS per puntare al tuo cluster
4. Opzionalmente, configura TLS/SSL

```bash
# Verifica l'ingress
kubectl get ingress
kubectl describe ingress website2markdown-ingress
```

### Cleanup

```bash
# Rimuovi tutte le risorse
kubectl delete -f k8s-manifest.yaml

# Verifica che tutto sia stato rimosso
kubectl get all -l app=website2markdown
```

## 🔧 Configurazioni avanzate

### Variabili d'ambiente personalizzate

Modifica il ConfigMap per aggiungere nuove variabili:

```bash
kubectl edit configmap website2markdown-config
```

### Risorse personalizzate

Modifica le richieste e i limiti di risorse nel deployment:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Persistent Storage

Se l'applicazione necessita di storage persistente, aggiungi un PersistentVolumeClaim:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: website2markdown-storage
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## 🚨 Troubleshooting

### Pod non si avvia

```bash
# Controlla lo stato del pod
kubectl describe pod <pod-name>

# Controlla i logs
kubectl logs <pod-name>

# Controlla gli eventi
kubectl get events --field-selector involvedObject.name=<pod-name>
```

### Servizio non raggiungibile

```bash
# Verifica che il service sia attivo
kubectl get svc website2markdown-service

# Test di connettività interna
kubectl run test-pod --image=busybox --rm -it -- sh
# Dentro il pod: wget -qO- http://website2markdown-service/health
```

### Health check fallisce

```bash
# Verifica l'endpoint di health
kubectl port-forward <pod-name> 3000:3000
curl http://localhost:3000/health
```