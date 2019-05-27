import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { AuthService, AuthResponseData } from './auth.service';
import { Router } from '@angular/router';
import { LoadingController, AlertController } from '@ionic/angular';
import { Observable } from 'rxjs';


@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
})
export class AuthPage implements OnInit {
  isLoading = false;
  isLogin = true;
  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
  }

  authenticate(email: string, password: string) {
    this.isLoading = true;    
    this.loadingCtrl.create({ keyboardClose: true, message: 'Logging in...' })
    .then(loadingEl => {
      loadingEl.present();
      let authObs: Observable<AuthResponseData>;
      if(this.isLogin) {
        authObs = this.authService.login(email, password);
      }
      else
      {
        authObs = this.authService.signup(email, password);
      }
      authObs.subscribe(resData => {
        console.log(resData);
        this.isLoading = false;
        loadingEl.dismiss();
        this.router.navigateByUrl('/places/tabs/discover');
      }, errorResponse => {
        loadingEl.dismiss();
        const code = errorResponse.error.error.message;
        let message = 'Could not sign you up, please try again.';
        if(code === 'EMAIL_EXISTS') {
          message = 'This email address already exists!';
        } else if (code === 'EMAIL_NOT_FOUND') {
          message = 'E-mail address could not be found.';
        } else if (code === 'INVALID_PASSWORD') {
          message = 'This password is not correct.';
        }
        this.showAlert(message);
      });      
    });
  }

  onSubmit(form: NgForm) {
    if (!form.valid) {
      return;
    }

    const email = form.value.email;
    const password = form.value.password;

    this.authenticate(email, password); 
    form.reset();      
  }  

  private showAlert(message: string) {
    this.alertCtrl.create({
      header: 'Authentication failed',
      message: message,
      buttons: ['Okay']
    }).then(alertEl => alertEl.present());
  }


  onSwitchAuthMode() {
    this.isLogin = !this.isLogin;
  }

}
