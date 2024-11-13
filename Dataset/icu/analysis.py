import pandas as pd

data = pd.read_csv('./inputevents.csv')
items = pd.read_csv('./d_items.csv')
items = list(items[items["category"]=="Medications"]["itemid"])
print(items)

data = data[data["itemid"].isin(items)]
print(data)
# medication_data = data.to_csv("./medicationinput.csv", index = False)
# count_df = data.groupby('ordercategoryname').size().reset_index(name='Count')
# count_df = count_df.sort_values(by='Count', ascending=False).reset_index(drop=True)
# medications = list(items[items["linksto"]=="inputevents"]["itemid"])
# print(count_df["itemid"][0])
# count_df = count_df[count_df["itemid"].isin(medications)]


for i,item in count_df.iterrows():
    count = item["Count"]
    item_id = item["itemid"]
    # if 
    # print(i)
    # if count>75:
    item_name = items[items["itemid"]==item_id]["label"].iloc[0]
    print(f"{item_name}")
# unique_count_df = data.groupby('itemid')['subject_id'].nunique().reset_index(name='unique_subject_count')
# unique_count_df = unique_count_df.sort_values(by='unique_subject_count', ascending=False).reset_index(drop=True)
# filtered_df = unique_count_df[unique_count_df['unique_subject_count'] >= 100]
# print(filtered_df)
# for i,item in filtered_df.iterrows():
#     count = item["Count"]
#     item_id = item["itemid"]
    
#     item_name = items[items["itemid"]==item_id]["label"].iloc[0]
#     print(item_name)

# print(filtered_df)

# items = [220045,220180,220179,220277]
# for person in 
# person1 = data[(data["subject_id"]==10005817) & (data["itemid"].isin(items))]

# print(person1)


# print(medications)