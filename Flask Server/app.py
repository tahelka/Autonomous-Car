from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from graph import Graph
from health import health_check
import time
import threading
import os
import uuid
import json
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# MongoDB connection setup
client = MongoClient("mongodb+srv://mongodb:Ha6j5kggIMvKE55S@cluster0.1kxk0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
db = client['talide']  
maps_collection = db['maps']


@app.route('/api/orders/delete/<order_id>', methods=['DELETE'])
def delete_order(order_id):
    print(f"Deleting order with ID: {order_id}")
    try:
        if not ObjectId.is_valid(order_id):
            return jsonify({"error": "Invalid order ID format"}), 400

        orders_collection = db['orders']
        result = orders_collection.delete_one({"_id": ObjectId(order_id)})

        if result.deleted_count > 0:
            return jsonify({"message": "Order deleted successfully"}), 200
        else:
            return jsonify({"error": "Order not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/orders/create', methods=['POST'])
def create_order():
    try:
        # Extract data from the request body
        data = request.json
        created_at = datetime.now()  # Current datetime
        contents = data.get('contents')
        map = data.get('map')
        origin = data.get('origin')
        destination = data.get('destination')

        # Validate required fields
        if not contents or not map or not origin or not destination:
            return jsonify({"error": "contents, map, origin, and destination are required"}), 400

        # Create the order document
        order = {
            "created_at": created_at,
            "contents": contents,
            "map": map,
            "origin": origin,
            "destination": destination
        }

        # Insert the order into the "orders" collection
        orders_collection = db['orders']
        result = orders_collection.insert_one(order)

        # Return success response with the order ID
        return jsonify({"message": "Order created successfully", "order_id": str(result.inserted_id)}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/orders', methods=['GET'])
def get_orders():
    try:
        # Retrieve all orders from the "orders" collection
        orders_collection = db['orders']
        orders = orders_collection.find()

        # Convert orders to a list of dictionaries
        orders_list = []
        for order in orders:
            order['_id'] = str(order['_id'])  # Convert ObjectId to string
            orders_list.append(order)

        # Return the list of orders
        return jsonify({"orders": orders_list}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/graph', methods=['GET'])
def get_route_instructions():
    try:
        # Extract query parameters
        mapid = request.args.get('mapid')
        start = request.args.get('start')
        target = request.args.get('target')
        orientation = request.args.get('orientation')
        
        # Validate query parameters
        if not mapid or not start or not target or not orientation:
            return jsonify({"error": "mapid, start, target, and orientation parameters are required"}), 400
        
        # Fetch map data from MongoDB
        map_document = maps_collection.find_one({'_id': mapid})
        
        if not map_document:
            return jsonify({"message": "Map not found"}), 404
        
        # Get the graph data from the MongoDB document
        graph_data = map_document.get('map_data')
        
        if not graph_data:
            return jsonify({"message": "Graph data not found in the map document"}), 404
        
        # Initialize the graph and populate it with the data
        graph = Graph()
        for node in graph_data:
            graph.add_vertex(node['id'])
        for node in graph_data:
            for edge in node['edges']:
                graph.add_edge(node['id'], edge['vertex'], edge['direction'])
        
        # Validate start and target parameters
        if not start or not target:
            return jsonify({"error": "Start and target parameters are required"}), 400
        
        # Find all paths and shortest paths
        all_paths = graph.find_all_paths(start, target)
        shortest_paths = graph.find_shortest_paths(all_paths)
        
        # Return the shortest path
        if shortest_paths:
            path_obj = shortest_paths[0]
            calculated_path = {
                "path": path_obj['path']['path'],
                "directions": path_obj['path']['directions'],
                "orientation": orientation,
                "mapid": mapid
            }
            return jsonify({
                "shortest_path": calculated_path
            }), 200
        else:
            return jsonify({"message": "No paths found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 400


app.add_url_rule('/health', view_func=health_check)

@app.route('/api/maps/save', methods=['POST'])
def save_map():
    try:
        # Get the map data from the request
        map_data = request.json
        
        # Generate a unique identifier for the map
        map_id = str(uuid.uuid4())
        
        # Get the current time
        creation_time = datetime.utcnow()
        
        # Save the map data to the MongoDB collection
        result = maps_collection.insert_one({
            '_id': map_id,
            'map_data': map_data,
            'created_at': creation_time
        })
        
        # Get the inserted ID from MongoDB
        inserted_id = str(result.inserted_id)
        
        return jsonify({"message": "Map saved successfully", "map_id": inserted_id, "created_at": creation_time.isoformat()}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400 

@app.route('/api/maps/delete/<map_id>', methods=['DELETE'])
def delete_map(map_id):
    try:
        # Delete the map document from MongoDB
        result = maps_collection.delete_one({'_id': map_id})
        
        if result.deleted_count > 0:
            return jsonify({"message": "Map deleted successfully"}), 200
        else:
            return jsonify({"message": "Map not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
@app.route('/api/maps', methods=['GET'])
def list_maps():
    try:
        # Retrieve all maps from the MongoDB collection
        cursor = maps_collection.find()
        
        # Convert MongoDB documents to a list of dictionaries
        maps = []
        for document in cursor:
            # Extract relevant data
            map_id = document.get('_id')
            map_data = document.get('map_data')
            creation_time = document.get('created_at')
            
            # Use a default value if creation_time is missing
            if creation_time is None:
                creation_time = datetime.utcnow()  # Default to current time
            else:
                # Ensure creation_time is a datetime object
                if isinstance(creation_time, str):
                    creation_time = datetime.fromisoformat(creation_time)
            
            # Format creation_time for response (ISO format string)
            formatted_creation_time = creation_time.isoformat()
            
            maps.append({
                "id": map_id,
                "data": map_data,
                "creation_time": formatted_creation_time
            })
        
        # Sort maps by creation time
        maps.sort(key=lambda x: x['creation_time'])
        
        return jsonify(maps), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == '__main__':
    from config import DEFAULT_PORT
    app.run(debug=True, port=DEFAULT_PORT)