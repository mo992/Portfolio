import torch
import torch.nn.functional as F
import pandas as pd

class CollaborativeFiltering:
    def __init__(self, ratings_df: pd.DataFrame):
        self.ratings_df = ratings_df
        self.ratings_tensor = torch.tensor(ratings_df.values, dtype=torch.float32)
        self.similarity_matrix = None

    def calculate_similarity(self):
        print("====== 計算用戶相似度 ======")
        norm_ratings = F.normalize(self.ratings_tensor, p=2, dim=1)
        self.similarity_matrix = torch.mm(norm_ratings, norm_ratings.T)
        print(f"用戶相似度矩陣:\n{self.similarity_matrix}\n")

    def predict_rating(self, user_index: int, item_index: int) -> float:
        if self.similarity_matrix is None:
            raise ValueError("請先計算用戶相似度矩陣。請先調用 calculate_similarity() 方法。")
        item_ratings = self.ratings_tensor[:, item_index]
        user_similarities = self.similarity_matrix[user_index]
        
        mask = item_ratings > 0
        relevant_similarities = user_similarities[mask]
        relevant_ratings = item_ratings[mask]
        
        if relevant_ratings.numel() == 0:
            return 0.0

        denom = torch.sum(torch.abs(relevant_similarities))
        if denom.item() == 0:
            return 0.0
        
        predicted_rating = torch.sum(relevant_similarities * relevant_ratings) / denom
        return predicted_rating.item()

    def recommend_items(self, user_index: int, top_n: int = 5):
        print(f"====== 為用戶 {user_index} 生成推薦 ======")
        user_ratings = self.ratings_tensor[user_index]
        unrated_items = torch.where(user_ratings == 0)[0]

        predictions = {}
        for item in unrated_items:
            predicted_rating = self.predict_rating(user_index, item.item())
            predictions[item.item()] = predicted_rating

        recommended_items = sorted(predictions, key=predictions.get, reverse=True)[:top_n]
        print(f"推薦物品索引: {recommended_items}\n")
        return recommended_items
