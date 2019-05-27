import { Injectable } from '@angular/core';
import { Place } from './place.model';
import { AuthService } from '../auth/auth.service';
import { BehaviorSubject, of } from 'rxjs';
import { take, map, tap, delay, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { PlaceLocation } from './location.model';

interface PlaceData {
  availableFrom: string;
  availableTo: string;
  description: string;
  imageUrl: string;
  price: number;
  title: string;
  userId: string;
  location: PlaceLocation;
}

// new Place(
//   'p1',
//   'Nelly Inn House',
//   'Located at the heart of the city',
//   'https://i.ytimg.com/vi/mb4irevK_Is/maxresdefault.jpg',
//   1500.59,
//   new Date('2019-01-01'),
//   new Date('2019-12-31'),
//   'abc'
// ),
// new Place(
//   'p2',
//   'Paully Inn House',
//   'Located on the outskirt of the city',
//   'https://i.ytimg.com/vi/rruJNmg7uBg/maxresdefault.jpg',
//   200,
//   new Date('2019-01-01'),
//   new Date('2019-12-31'),
//   'abc'
// ),
// new Place(
//   'p3',
//   'Romantic Cottage',
//   'Romantic location within the city',
//   'http://hbu.h-cdn.co/assets/15/24/1433972013-faerie-cottage-index.jpg',
//   100,
//   new Date('2019-01-01'),
//   new Date('2019-12-31'),
//   'abc'
// ),
// new Place(
//   'p4',
//   'Modern Cottage',
//   'Romantic views of the countryside',
//   'https://s-media-cache-ak0.pinimg.com/736x/9b/fe/1c/9bfe1c4430195ad7716837f12c3d73a4.jpg',
//   100,
//   new Date('2019-01-01'),
//   new Date('2019-12-31'),
//   'abc'
// )

@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  private thePlaces = new BehaviorSubject<Place[]>([]);

  get places() {
    return this.thePlaces.asObservable();
  }

  constructor(private authService: AuthService, private http: HttpClient) { }

  fetchPlaces() {
    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
      return this.http
      .get<{[key: string]: PlaceData }>(
        `https://theaccommodationbooking.firebaseio.com/offered-places.json?auth=${token}`
        );
    }),
    map(resData => {
        const places = [];
        for (const key in resData) {
          if (resData.hasOwnProperty(key)) {
            places.push(
              new Place(
                key,
                resData[key].title,
                resData[key].description,
                resData[key].imageUrl,
                resData[key].price,
                new Date(resData[key].availableFrom),
                new Date(resData[key].availableTo),
                resData[key].userId,
                resData[key].location
              )
            );
          }
        }
        return places;
      }),
      tap(places => {
        this.thePlaces.next(places);
      })
    );
  }

  // getPlace(id: string) {
  //   return this.places.pipe(take(1), map(places => {
  //       return {...places.find(p => p.id === id)};
  //     })
  //   );
  // }
  getPlace(id: string) {
    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
      return this.http.get<PlaceData>(
        `https://theaccommodationbooking.firebaseio.com/offered-places/${id}.json?auth=${token}`
      )
    }),
      map(placeData => {
        return new Place(
          id, 
          placeData.title,
          placeData.description,
          placeData.imageUrl,
          placeData.price,
          new Date(placeData.availableFrom),
          new Date(placeData.availableTo),
          placeData.userId,
          placeData.location
        );
    }));
  }

  uploadImage(image: File) {
    const uploadData = new FormData();
    uploadData.append('image', image);

    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
      return this.http.post<{imageUrl: string, imagePath: string}>(
        'https://us-central1-theaccommodationbooking.cloudfunctions.net/storeImage', 
        uploadData, 
        {headers: {Authorization: 'Bearer ' + token}}
      );
    }))

    
  }

  addPlace(title: string,
    description: string,
    price: number,
    dateFrom: Date,
    dateTo: Date,
    location: PlaceLocation,
    imageUrl: string
  ) {
    let generatedId: string;
    let fetchedUserId: string;
    let newPlace: Place;
    return this.authService.userId.pipe(
      take(1), 
      switchMap(userId => {
        fetchedUserId = userId;
        return this.authService.token;
      }),
      take(1),
      switchMap(token => {
      if(!fetchedUserId) {
        throw new Error('No user found!');
      }

      newPlace = new Place(
        Math.random().toString(),
        title,
        description,
        imageUrl,
        price,
        dateFrom,
        dateTo,
        fetchedUserId,
        location
      );
      return this.http.
        post<{name: string}>(`https://theaccommodationbooking.firebaseio.com/offered-places.json?auth=${token}`, 
        { 
          ...newPlace, 
          id: null
        }
      );
        
    }),
     switchMap(resData => {
          generatedId = resData.name;
          return this.places;
        }),
        take(1),
        tap(places => {
          newPlace.id = generatedId;
          this.thePlaces.next(places.concat(newPlace)
          );
        })
    );

    // return this.places.pipe(
    //   take(1),
    //   delay(2000),
    //   tap(places => {
    //     this.thePlaces.next(places.concat(newPlace));
    //   })
    // );
  }

  updatePlace(placeId: string, title: string, description: string) {
    let updatedPlaces: Place[];
    let fetchedToken: string;
    return this.authService.token.pipe(
      take(1), 
      switchMap(token => {
        fetchedToken = token;
        return this.places;
      }),    
      take(1),      
      switchMap(places => {
        if (!places || places.length <= 0) {
          return this.fetchPlaces();
        } else {
          return of(places);
        }      
      }),
      switchMap(places => {
        const updatedPlaceIndex = places.findIndex(pl => pl.id === placeId);
      updatedPlaces = [...places];
      const oldPlace = updatedPlaces[updatedPlaceIndex];
      updatedPlaces[updatedPlaceIndex] = new Place(
        oldPlace.id,
        title,
        description,
        oldPlace.imageUrl,
        oldPlace.price,
        oldPlace.availableFrom,
        oldPlace.availableTo,
        oldPlace.userId,
        oldPlace.location
      );
      return this.http.put(
        `https://theaccommodationbooking.firebaseio.com/offered-places/${placeId}.json?auth=${fetchedToken}`,
        { ...updatedPlaces[updatedPlaceIndex], id: null }
      );
      }), 
      tap(() => {
        this.thePlaces.next(updatedPlaces);
      })      
    );
  }
}
