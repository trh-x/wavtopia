#!/bin/bash

# Default values
HOST="localhost"
PORT="3001"
TIMEFRAME_VALUE=""
TIMEFRAME_UNIT="days"

# Help message
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo "Trigger the file cleanup job on the media service."
    echo ""
    echo "Options:"
    echo "  -h, --host      Host address (default: localhost)"
    echo "  -p, --port      Port number (default: 3001)"
    echo "  -t, --time      Time value for cleanup threshold"
    echo "  -u, --unit      Time unit (days|hours|minutes|seconds) (default: days)"
    echo "  --help          Show this help message"
    echo ""
    echo "Example:"
    echo "  $0                                    # Use default (7 days)"
    echo "  $0 -h api.example.com                 # Specify different host"
    echo "  $0 -p 8080                           # Specify different port"
    echo "  $0 -t 3                              # Clean files older than 3 days"
    echo "  $0 -t 12 -u hours                    # Clean files older than 12 hours"
    echo "  $0 -t 30 -u minutes                  # Clean files older than 30 minutes"
    echo "  $0 -t 1.5 -u hours                   # Clean files older than 1.5 hours"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            HOST="$2"
            shift 2
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -t|--time)
            TIMEFRAME_VALUE="$2"
            shift 2
            ;;
        -u|--unit)
            TIMEFRAME_UNIT="$2"
            if [[ ! "$TIMEFRAME_UNIT" =~ ^(days|hours|minutes|seconds)$ ]]; then
                echo "Error: Invalid time unit. Must be one of: days, hours, minutes, seconds"
                exit 1
            fi
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Construct the URL
URL="http://${HOST}:${PORT}/api/media/trigger-cleanup"

echo "Triggering cleanup job at ${URL}..."

# Prepare the request body
if [ -n "$TIMEFRAME_VALUE" ]; then
    BODY="{\"timeframe\": {\"value\": $TIMEFRAME_VALUE, \"unit\": \"$TIMEFRAME_UNIT\"}}"
else
    BODY="{}"
fi

# Make the request
response=$(curl -s -X POST "${URL}" \
    -H "Content-Type: application/json" \
    -d "$BODY")

# Check if curl command was successful
if [ $? -eq 0 ]; then
    echo "Response:"
    if command -v jq >/dev/null 2>&1; then
        echo "${response}" | jq '.'
    else
        echo "${response}"
        echo "Note: Install 'jq' for prettier JSON output"
    fi
else
    echo "Error: Failed to connect to ${URL}"
    exit 1
fi 